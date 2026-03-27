import { createProviderAdapters, findAdapter } from "../../adapters/src/index";
import { loadRunBundle, updateAdapters, updateExecutionLog, updateRunState } from "../../memory/src/run-store";
import type { AdapterExecutionSummary, PlanTask, RunBundle, StepExecutionLog, StepStatus } from "../../shared/src/types";

function nowIso(): string {
  return new Date().toISOString();
}

function pushStepLog(bundle: RunBundle, entry: StepExecutionLog): void {
  bundle.executionLog.steps.push(entry);
  updateExecutionLog(bundle.state.runId, bundle.executionLog);
}

function upsertAdapterSummary(bundle: RunBundle, summary: AdapterExecutionSummary): void {
  const idx = bundle.adapters.executions.findIndex((item) => item.taskId === summary.taskId);
  if (idx >= 0) bundle.adapters.executions[idx] = summary;
  else bundle.adapters.executions.push(summary);
  bundle.adapters.createdAt = nowIso();
  updateAdapters(bundle.state.runId, bundle.adapters);
}

function markState(bundle: RunBundle, status: RunBundle["state"]["status"], extras?: Partial<RunBundle["state"]>): void {
  bundle.state = {
    ...bundle.state,
    ...extras,
    status,
    updatedAt: nowIso(),
  };
  updateRunState(bundle.state.runId, bundle.state);
}

async function executeTask(bundle: RunBundle, task: PlanTask, index: number): Promise<{ completed: boolean; paused?: boolean }> {
  const adapters = createProviderAdapters();

  if (task.requiresApproval && !bundle.state.approved) {
    markState(bundle, "paused", {
      currentStepIndex: index,
      approvalRequired: true,
      pauseReason: `Approval required before step ${task.id}`,
    });
    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 0,
      status: "paused",
      startedAt: nowIso(),
      finishedAt: nowIso(),
      output: "Execution paused pending approval.",
      rollbackAvailable: Boolean(task.rollbackPayload),
    });
    return { completed: false, paused: true };
  }

  const adapter = findAdapter(adapters, task.adapterId);
  if (!adapter) {
    const missingStatus: StepStatus = "failed";
    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 1,
      status: missingStatus,
      startedAt: nowIso(),
      finishedAt: nowIso(),
      error: `Adapter not found: ${task.adapterId}`,
      rollbackAvailable: Boolean(task.rollbackPayload),
    });
    upsertAdapterSummary(bundle, {
      taskId: task.id,
      adapter: task.adapterId,
      status: missingStatus,
      attempts: 1,
      output: `Adapter not found: ${task.adapterId}`,
    });
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  const validated = await adapter.validate(task.payload);
  if (!validated) {
    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 1,
      status: "failed",
      startedAt: nowIso(),
      finishedAt: nowIso(),
      error: `Validation failed for adapter ${task.adapterId}`,
      rollbackAvailable: Boolean(task.rollbackPayload),
    });
    upsertAdapterSummary(bundle, {
      taskId: task.id,
      adapter: task.adapterId,
      status: "failed",
      attempts: 1,
      output: `Validation failed for adapter ${task.adapterId}`,
    });
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  const maxAttempts = task.retryPolicy?.maxAttempts ?? 1;
  let success = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = nowIso();
    try {
      const result = await adapter.execute(task.payload);
      if (!result.success) {
        throw new Error(result.error || "Unknown adapter error");
      }

      const output = result.output ?? "Execution succeeded.";
      success = true;
      pushStepLog(bundle, {
        stepId: task.id,
        title: task.title,
        adapter: task.adapterId,
        attempt,
        status: "success",
        startedAt,
        finishedAt: nowIso(),
        output,
        rollbackAvailable: Boolean(task.rollbackPayload),
      });
      upsertAdapterSummary(bundle, {
        taskId: task.id,
        adapter: task.adapterId,
        status: "success",
        attempts: attempt,
        output,
      });
      bundle.state.currentStepIndex = index + 1;
      bundle.state.updatedAt = nowIso();
      updateRunState(bundle.state.runId, bundle.state);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushStepLog(bundle, {
        stepId: task.id,
        title: task.title,
        adapter: task.adapterId,
        attempt,
        status: "failed",
        startedAt,
        finishedAt: nowIso(),
        error: message,
        rollbackAvailable: Boolean(task.rollbackPayload),
      });

      if (attempt === maxAttempts) {
        if (task.rollbackPayload && adapter.rollback) {
          await adapter.rollback(task.rollbackPayload);
          pushStepLog(bundle, {
            stepId: task.id,
            title: `${task.title} rollback`,
            adapter: task.adapterId,
            attempt,
            status: "rolled-back",
            startedAt: nowIso(),
            finishedAt: nowIso(),
            output: "Rollback completed.",
            rollbackAvailable: true,
          });
        }

        upsertAdapterSummary(bundle, {
          taskId: task.id,
          adapter: task.adapterId,
          status: "failed",
          attempts: attempt,
          output: message,
        });
        markState(bundle, "failed", { currentStepIndex: index });
        return { completed: false };
      }
    }
  }

  if (!success) {
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  return { completed: true };
}

export async function executeRunBundle(bundle: RunBundle): Promise<RunBundle> {
  markState(bundle, bundle.state.status === "planned" ? "running" : bundle.state.status, {
    pauseReason: undefined,
  });

  for (let index = bundle.state.currentStepIndex; index < bundle.plan.tasks.length; index += 1) {
    const task = bundle.plan.tasks[index];
    const result = await executeTask(bundle, task, index);
    if (!result.completed) {
      if (result.paused) return bundle;
      return bundle;
    }
  }

  markState(bundle, "completed", {
    currentStepIndex: bundle.plan.tasks.length,
    approvalRequired: false,
    pauseReason: undefined,
  });
  return bundle;
}

export async function retryTask(runId: string, targetStepId?: string): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  const stepId = targetStepId ?? bundle.plan.tasks[bundle.state.currentStepIndex]?.id;
  const index = bundle.plan.tasks.findIndex((task) => task.id === stepId);
  if (index < 0) {
    throw new Error(`Step not found: ${stepId ?? "undefined"}`);
  }

  bundle.state.currentStepIndex = index;
  bundle.state.status = "running";
  bundle.state.pauseReason = undefined;
  bundle.state.updatedAt = nowIso();
  updateRunState(bundle.state.runId, bundle.state);

  await executeTask(bundle, bundle.plan.tasks[index], index);
  return loadRunBundle(runId);
}

export async function rollbackTask(runId: string, targetStepId?: string): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  const stepId = targetStepId ?? bundle.executionLog.steps.at(-1)?.stepId;
  const task = bundle.plan.tasks.find((item) => item.id === stepId);
  if (!task) {
    throw new Error(`Step not found for rollback: ${stepId ?? "undefined"}`);
  }

  const adapter = findAdapter(createProviderAdapters(), task.adapterId);
  if (!adapter?.rollback || !task.rollbackPayload) {
    throw new Error(`Rollback not available for step: ${task.id}`);
  }

  await adapter.rollback(task.rollbackPayload);
  pushStepLog(bundle, {
    stepId: task.id,
    title: `${task.title} manual rollback`,
    adapter: task.adapterId,
    attempt: 1,
    status: "rolled-back",
    startedAt: nowIso(),
    finishedAt: nowIso(),
    output: "Manual rollback completed.",
    rollbackAvailable: true,
  });
  upsertAdapterSummary(bundle, {
    taskId: task.id,
    adapter: task.adapterId,
    status: "rolled-back",
    attempts: 1,
    output: "Manual rollback completed.",
  });

  if (bundle.state.currentStepIndex > 0) {
    bundle.state.currentStepIndex -= 1;
  }
  bundle.state.updatedAt = nowIso();
  updateRunState(bundle.state.runId, bundle.state);
  return loadRunBundle(runId);
}
