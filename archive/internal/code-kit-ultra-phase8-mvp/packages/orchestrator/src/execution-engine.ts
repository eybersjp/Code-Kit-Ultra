import { createProviderAdapters, findAdapter } from "../../adapters/src/index";
import { updateAdapters, updateExecutionLog, updateRunState } from "../../memory/src/run-store";
import type { AdapterExecutionSummary, RunBundle, StepExecutionLog, StepStatus } from "../../shared/src/types";

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

export async function executeRunBundle(bundle: RunBundle): Promise<RunBundle> {
  const adapters = createProviderAdapters();

  markState(bundle, bundle.state.status === "planned" ? "running" : bundle.state.status, {
    pauseReason: undefined,
  });

  for (let index = bundle.state.currentStepIndex; index < bundle.plan.tasks.length; index += 1) {
    const task = bundle.plan.tasks[index];

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
      return bundle;
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
      return bundle;
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
      return bundle;
    }

    const maxAttempts = task.retryPolicy?.maxAttempts ?? 1;
    let success = false;
    let finalOutput = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const startedAt = nowIso();
      try {
        const result = await adapter.execute(task.payload);
        if (!result.success) {
          throw new Error(result.error || "Unknown adapter error");
        }

        success = true;
        finalOutput = result.output ?? "Execution succeeded.";
        pushStepLog(bundle, {
          stepId: task.id,
          title: task.title,
          adapter: task.adapterId,
          attempt,
          status: "success",
          startedAt,
          finishedAt: nowIso(),
          output: finalOutput,
          rollbackAvailable: Boolean(task.rollbackPayload),
        });
        upsertAdapterSummary(bundle, {
          taskId: task.id,
          adapter: task.adapterId,
          status: "success",
          attempts: attempt,
          output: finalOutput,
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
          return bundle;
        }
      }
    }

    if (!success) {
      markState(bundle, "failed", { currentStepIndex: index });
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
