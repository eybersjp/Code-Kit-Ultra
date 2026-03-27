import { createProviderAdapters, findAdapter } from "../../adapters/src/index";
import { loadRunBundle, updateAdapters, updateExecutionLog, updateRunState } from "../../memory/src/run-store";
import type { AdapterExecutionSummary, PlanTask, RunBundle, StepExecutionLog, StepStatus } from "../../shared/src/types";
import { evaluatePolicy } from "../../core/src/policy-engine";
import { writeAuditEvent } from "../../audit/src/index";

function nowIso(): string {
  return new Date().toISOString();
}

function pushStepLog(bundle: RunBundle, entry: StepExecutionLog): void {
  bundle.executionLog.steps.push(entry);
  updateExecutionLog(bundle.state.runId, bundle.executionLog);
}

function computeMetrics(bundle: RunBundle, success: boolean) {
  const steps = bundle.executionLog.steps;
  const timeTakenMs = steps.reduce((sum, s) => sum + (new Date(s.finishedAt || new Date()).getTime() - new Date(s.startedAt || new Date()).getTime()), 0);
  const retryCount = steps.reduce((sum, s) => sum + (s.attempt > 1 ? s.attempt - 1 : 0), 0);
  const qualityScore = success ? 1 : 0;
  const adaptersUsed = Array.from(new Set(steps.map(s => s.adapter)));
  return { timeTakenMs, retryCount, qualityScore, adaptersUsed };
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

async function executeTask(
  bundle: RunBundle,
  task: PlanTask,
  index: number,
  actor: string = "system"
): Promise<{ completed: boolean; paused?: boolean }> {
  const adapters = createProviderAdapters();

  // 1. Audit Start
  writeAuditEvent({
    runId: bundle.state.runId,
    actorName: actor,
    actorId: bundle.state.actorId,
    actorType: bundle.state.actorType,
    orgId: bundle.state.orgId,
    workspaceId: bundle.state.workspaceId,
    projectId: bundle.state.projectId,
    correlationId: bundle.state.correlationId,
    role: actor === "system" ? "system" : "operator",
    action: "TASK_EXECUTION_ATTEMPT",
    stepId: task.id,
    details: { index, title: task.title, adapter: task.adapterId },
  });

  // 2. Policy Evaluation
  const policyResult = evaluatePolicy(task);
  if (!policyResult.allowed) {
    const error = policyResult.reason || "Blocked by policy";
    writeAuditEvent({
      runId: bundle.state.runId,
      actorName: "system",
      actorId: bundle.state.actorId,
      actorType: bundle.state.actorType,
      orgId: bundle.state.orgId,
      workspaceId: bundle.state.workspaceId,
      projectId: bundle.state.projectId,
      correlationId: bundle.state.correlationId,
      role: "system",
      action: "POLICY_BLOCK",
      stepId: task.id,
      details: { reason: error },
    });

    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 1,
      status: "failed",
      startedAt: nowIso(),
      finishedAt: nowIso(),
      error,
      rollbackAvailable: Boolean(task.rollbackPayload),
    });
    upsertAdapterSummary(bundle, {
      taskId: task.id,
      adapter: task.adapterId,
      status: "failed",
      attempts: 1,
      output: error,
    });
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  const adapter = findAdapter(adapters, task.adapterId);
  if (!adapter) {
    const error = `Adapter not found: ${task.adapterId}`;
    writeAuditEvent({
      runId: bundle.state.runId,
      actorName: "system",
      actorId: bundle.state.actorId,
      actorType: bundle.state.actorType,
      orgId: bundle.state.orgId,
      workspaceId: bundle.state.workspaceId,
      projectId: bundle.state.projectId,
      correlationId: bundle.state.correlationId,
      role: "system",
      action: "ADAPTER_NOT_FOUND",
      stepId: task.id,
      details: { adapterId: task.adapterId },
    });
    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 1,
      status: "failed",
      startedAt: nowIso(),
      finishedAt: nowIso(),
      error,
      rollbackAvailable: Boolean(task.rollbackPayload),
    });
    upsertAdapterSummary(bundle, {
      taskId: task.id,
      adapter: task.adapterId,
      status: "failed",
      attempts: 1,
      output: error,
    });
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  // 3. Intelligent Simulation & Risk Assessment
  const simulation = adapter.simulate ? await adapter.simulate(task.payload) : undefined;
  const estimatedRisk = simulation?.risk ?? (adapter.estimateRisk ? await adapter.estimateRisk(task.payload) : "medium");
  
  // 4. Approval Gating (Risk-Aware)
  const requiresApproval = task.requiresApproval || policyResult.requiresApproval || simulation?.requiresApproval || estimatedRisk === "high";

  if (requiresApproval && !bundle.state.approved) {
    markState(bundle, "paused", {
      currentStepIndex: index,
      approvalRequired: true,
      pauseReason: simulation?.summary || policyResult.reason || `Step ${task.id} requires approval (Risk: ${estimatedRisk})`,
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
      risk: estimatedRisk,
      simulationSummary: simulation?.summary,
    });
    writeAuditEvent({
      runId: bundle.state.runId,
      actorName: "system",
      actorId: bundle.state.actorId,
      actorType: bundle.state.actorType,
      orgId: bundle.state.orgId,
      workspaceId: bundle.state.workspaceId,
      projectId: bundle.state.projectId,
      correlationId: bundle.state.correlationId,
      role: "system",
      action: "APPROVAL_REQUIRED",
      stepId: task.id,
      details: { reason: bundle.state.pauseReason, risk: estimatedRisk },
    });
    return { completed: false, paused: true };
  }

  // 5. Validation
  const validated = await adapter.validate(task.payload);
  if (!validated) {
    const fixSuggestion = adapter.suggestFix ? await adapter.suggestFix(new Error("Validation failed"), task.payload) : undefined;
    const error = `Validation failed for adapter ${task.adapterId}`;
    writeAuditEvent({
      runId: bundle.state.runId,
      actorName: "system",
      actorId: bundle.state.actorId,
      actorType: bundle.state.actorType,
      orgId: bundle.state.orgId,
      workspaceId: bundle.state.workspaceId,
      projectId: bundle.state.projectId,
      correlationId: bundle.state.correlationId,
      role: "system",
      action: "VALIDATION_FAILED",
      stepId: task.id,
      details: { error, fixSuggestion },
    });
    pushStepLog(bundle, {
      stepId: task.id,
      title: task.title,
      adapter: task.adapterId,
      attempt: 1,
      status: "failed",
      startedAt: nowIso(),
      finishedAt: nowIso(),
      error,
      rollbackAvailable: Boolean(task.rollbackPayload),
      risk: estimatedRisk,
      simulationSummary: simulation?.summary,
      fixSuggestion,
    });
    upsertAdapterSummary(bundle, {
      taskId: task.id,
      adapter: task.adapterId,
      status: "failed",
      attempts: 1,
      output: error,
    });
    markState(bundle, "failed", { currentStepIndex: index });
    return { completed: false };
  }

  // 6. Execution with Outcome Verification
  let maxAttempts = task.retryPolicy?.maxAttempts ?? 1;
  let success = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = nowIso();
    try {
      writeAuditEvent({
        runId: bundle.state.runId,
        actorName: "system",
        actorId: bundle.state.actorId,
        actorType: bundle.state.actorType,
        orgId: bundle.state.orgId,
        workspaceId: bundle.state.workspaceId,
        projectId: bundle.state.projectId,
        correlationId: bundle.state.correlationId,
        role: "system",
        action: "STEP_EXECUTION_STARTED",
        stepId: task.id,
        details: { attempt, adapterId: task.adapterId, risk: estimatedRisk },
      });

      const result = await adapter.execute(task.payload);
      if (!result.success) throw new Error(result.error || "Unknown adapter error");

      // Verify Outcome
      const verification = adapter.verify ? await adapter.verify(task.payload, result) : { ok: true, summary: "No verification hook; accepting successful execution." };
      if (!verification.ok) throw new Error(`Verification failed: ${verification.summary}`);

      const output = String(result.output ?? "Execution succeeded.");
      success = true;

      writeAuditEvent({
        runId: bundle.state.runId,
        actorName: "system",
        actorId: bundle.state.actorId,
        actorType: bundle.state.actorType,
        orgId: bundle.state.orgId,
        workspaceId: bundle.state.workspaceId,
        projectId: bundle.state.projectId,
        correlationId: bundle.state.correlationId,
        role: "system",
        action: "STEP_EXECUTION_SUCCEEDED",
        stepId: task.id,
        details: { attempt, output: output.substring(0, 200), verificationStatus: "passed" },
      });

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
        risk: estimatedRisk,
        simulationSummary: simulation?.summary,
        verificationStatus: "passed",
        verificationSummary: verification.summary,
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
      bundle.state.approved = false;
      bundle.state.approvalRequired = false;
      updateRunState(bundle.state.runId, bundle.state);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const fixSuggestion = adapter.suggestFix ? await adapter.suggestFix(error, task.payload) : undefined;

      writeAuditEvent({
        runId: bundle.state.runId,
        actorName: "system",
        actorId: bundle.state.actorId,
        actorType: bundle.state.actorType,
        orgId: bundle.state.orgId,
        workspaceId: bundle.state.workspaceId,
        projectId: bundle.state.projectId,
        correlationId: bundle.state.correlationId,
        role: "system",
        action: "STEP_EXECUTION_FAILED",
        stepId: task.id,
        details: { attempt, error: message, fixSuggestion },
      });

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
        risk: estimatedRisk,
        simulationSummary: simulation?.summary,
        verificationStatus: "failed",
        verificationSummary: message,
        fixSuggestion,
      });

      if (attempt === maxAttempts) {
        // Healing Attempt Phase 10.5
        try {
          const { healFailedStep } = await import("./healing-integration.js");
          
          const healingAttempt = await healFailedStep({
             runId: bundle.state.runId,
             stepId: task.id,
             adapterId: task.adapterId,
             errorMessage: String(error),
             payload: task.payload,
             scope: {
               runId: bundle.state.runId,
               tenant: {
                 orgId: bundle.state.orgId || "unknown",
                 workspaceId: bundle.state.workspaceId || "unknown",
                 projectId: bundle.state.projectId || "unknown",
               },
               actor: {
                 actorId: bundle.state.actorId || "unknown",
                 actorType: (bundle.state.actorType as any) || "user",
                 actorName: actor,
                 roles: [],
               },
               correlationId: bundle.state.correlationId || "unknown",
             },
          });

          if (healingAttempt.status === "verified") {
            writeAuditEvent({
              runId: bundle.state.runId,
              actorName: "system",
              actorId: bundle.state.actorId,
              actorType: bundle.state.actorType,
              orgId: bundle.state.orgId,
              workspaceId: bundle.state.workspaceId,
              projectId: bundle.state.projectId,
              correlationId: bundle.state.correlationId,
              role: "system",
              action: "HEALING_APPLIED_AND_VERIFIED",
              stepId: task.id,
              details: { attemptId: healingAttempt.id, strategy: healingAttempt.selectedStrategyId },
            });
            maxAttempts += 1;
            continue; // Give execution one more try after healing!
          } else if (healingAttempt.approvalRequired) {
            markState(bundle, "paused", {
              currentStepIndex: index,
              approvalRequired: true,
              pauseReason: `Healing strategy ${healingAttempt.selectedStrategyId} requires approval.`,
            });
            return { completed: false, paused: true };
          } else {
             writeAuditEvent({
              runId: bundle.state.runId,
              actorName: "system",
              actorId: bundle.state.actorId,
              actorType: bundle.state.actorType,
              orgId: bundle.state.orgId,
              workspaceId: bundle.state.workspaceId,
              projectId: bundle.state.projectId,
              correlationId: bundle.state.correlationId,
              role: "system",
              action: "HEALING_ATTEMPTED_BUT_ESCALATED",
              stepId: task.id,
              details: { attemptId: healingAttempt.id, status: healingAttempt.status },
            });
          }
        } catch (healError) {
          writeAuditEvent({
            runId: bundle.state.runId,
            actorName: "system",
            actorId: bundle.state.actorId,
            actorType: bundle.state.actorType,
            orgId: bundle.state.orgId,
            workspaceId: bundle.state.workspaceId,
            projectId: bundle.state.projectId,
            correlationId: bundle.state.correlationId,
            role: "system",
            action: "HEALING_ENGINE_ERROR",
            stepId: task.id,
            details: { error: String(healError) },
          });
        }

        if (task.rollbackPayload && adapter.rollback) {
          await adapter.rollback(task.rollbackPayload);
          writeAuditEvent({ 
            runId: bundle.state.runId, 
            actorName: "system", 
            actorId: bundle.state.actorId,
            actorType: bundle.state.actorType,
            orgId: bundle.state.orgId,
            workspaceId: bundle.state.workspaceId,
            projectId: bundle.state.projectId,
            correlationId: bundle.state.correlationId,
            role: "system", 
            action: "ROLLBACK_COMPLETED", 
            stepId: task.id, 
            details: { automatic: true } 
          });
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
            risk: estimatedRisk,
          });
        }
        upsertAdapterSummary(bundle, {
          taskId: task.id,
          adapter: task.adapterId,
          status: "failed",
          attempts: attempt,
          output: fixSuggestion ? `${message} | suggested fix: ${fixSuggestion}` : message,
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

export async function executeRunBundle(bundle: RunBundle, actor: string = "system"): Promise<RunBundle> {
  markState(bundle, bundle.state.status === "planned" ? "running" : bundle.state.status, {
    pauseReason: undefined,
  });

  const { loadLearningStore } = await import("../../learning/src/store.js");
  const { optimizeTasks } = await import("../../learning/src/execution-optimizer.js");
  const store = loadLearningStore();
  const { tasks, suggestions } = optimizeTasks(bundle.plan.tasks, store);
  
  tasks.forEach((optTask: any, i: number) => {
    if (optTask.retryLimit !== undefined) {
      bundle.plan.tasks[i] = {
        ...bundle.plan.tasks[i],
        retryPolicy: { ...bundle.plan.tasks[i].retryPolicy, maxAttempts: optTask.retryLimit }
      };
    }
  });

  if (suggestions.length > 0) {
    writeAuditEvent({
      runId: bundle.state.runId,
      actorName: "system",
      actorId: bundle.state.actorId,
      actorType: bundle.state.actorType,
      orgId: bundle.state.orgId,
      workspaceId: bundle.state.workspaceId,
      projectId: bundle.state.projectId,
      correlationId: bundle.state.correlationId,
      role: "system",
      action: "OPTIMIZER_SUGGESTIONS_APPLIED",
      details: { suggestions },
    });
  }

  for (let index = bundle.state.currentStepIndex; index < bundle.plan.tasks.length; index += 1) {
    const task = bundle.plan.tasks[index];
    const result = await executeTask(bundle, task, index, actor);
    if (!result.completed) {
      if (bundle.state.status === "failed") {
        const { recordRunOutcome } = await import("./outcome-engine.js");
        const m = computeMetrics(bundle, false);
        recordRunOutcome({ runId: bundle.state.runId, success: false, ...m, dominantFailureType: "step-failed" });
      }
      return bundle;
    }
  }

  writeAuditEvent({ 
    runId: bundle.state.runId, 
    actorName: "system", 
    actorId: bundle.state.actorId,
    actorType: bundle.state.actorType,
    orgId: bundle.state.orgId,
    workspaceId: bundle.state.workspaceId,
    projectId: bundle.state.projectId,
    correlationId: bundle.state.correlationId,
    role: "system", 
    action: "RUN_COMPLETED" 
  });
  markState(bundle, "completed", {
    currentStepIndex: bundle.plan.tasks.length,
    approvalRequired: false,
    pauseReason: undefined,
  });

  const { recordRunOutcome } = await import("./outcome-engine.js");
  const metrics = computeMetrics(bundle, true);
  recordRunOutcome({ runId: bundle.state.runId, success: true, ...metrics });

  return bundle;
}

export async function retryTask(runId: string, targetStepId?: string, actor: string = "system"): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  if (!bundle) throw new Error(`Run bundle not found: ${runId}`);
  
  const stepId = targetStepId ?? bundle.plan.tasks[bundle.state.currentStepIndex]?.id;
  const index = bundle.plan.tasks.findIndex((task) => task.id === stepId);
  if (index < 0) throw new Error(`Step not found: ${stepId ?? "undefined"}`);
  
  bundle.state.currentStepIndex = index;
  bundle.state.status = "running";
  bundle.state.pauseReason = undefined;
  bundle.state.updatedAt = nowIso();
  updateRunState(bundle.state.runId, bundle.state);
  writeAuditEvent({ 
    runId, 
    actorName: actor, 
    actorId: bundle.state.actorId,
    actorType: bundle.state.actorType,
    orgId: bundle.state.orgId,
    workspaceId: bundle.state.workspaceId,
    projectId: bundle.state.projectId,
    correlationId: bundle.state.correlationId,
    role: "system", 
    action: "STEP_RETRY_REQUESTED", 
    stepId, 
    details: { currentStepIndex: index } 
  });
  
  await executeTask(bundle, bundle.plan.tasks[index], index, actor);
  const updated = loadRunBundle(runId);
  if (!updated) throw new Error(`Run bundle not found after retry: ${runId}`);
  return updated;
}

export async function rollbackTask(runId: string, targetStepId?: string, actor: string = "system"): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  if (!bundle) throw new Error(`Run bundle not found: ${runId}`);
  
  const stepId = targetStepId ?? bundle.executionLog.steps.at(-1)?.stepId;
  const task = bundle.plan.tasks.find((item) => item.id === stepId);
  if (!task) throw new Error(`Step not found for rollback: ${stepId ?? "undefined"}`);

  const adapter = findAdapter(createProviderAdapters(), task.adapterId);
  if (!adapter?.rollback || !task.rollbackPayload) throw new Error(`Rollback not available for step: ${task.id}`);

  await adapter.rollback(task.rollbackPayload);
  writeAuditEvent({ 
    runId: bundle.state.runId, 
    actorName: actor, 
    actorId: bundle.state.actorId,
    actorType: bundle.state.actorType,
    orgId: bundle.state.orgId,
    workspaceId: bundle.state.workspaceId,
    projectId: bundle.state.projectId,
    correlationId: bundle.state.correlationId,
    role: actor === "system" ? "system" : "operator", 
    action: "TASK_ROLLBACK_MANUAL", 
    stepId: task.id, 
    details: { targetStepId } 
  });
  
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

  if (bundle.state.currentStepIndex > 0) bundle.state.currentStepIndex -= 1;
  bundle.state.updatedAt = nowIso();
  updateRunState(bundle.state.runId, bundle.state);
  const updated = loadRunBundle(runId);
  if (!updated) throw new Error(`Run bundle not found after rollback: ${runId}`);
  return updated;
}
