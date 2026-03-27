import { getAdapterRegistry } from "../../adapters/src/registry";
import { selectAdapter } from "../../adapters/src/router";
import type { TaskType } from "../../shared/src/types";
import type { ExecutionResult } from "../../adapters/src/execution-result";
import { writeExecutionAudit } from "../../governance/src/execution-audit";
import { recordExecution } from "../../memory/src/run-store";

export async function executeTask(taskType: TaskType, payload: unknown, dryRun = false): Promise<ExecutionResult> {
  const route = await selectAdapter(taskType);
  const adapter = getAdapterRegistry().find((a) => a.name === route.adapterName);
  const started = Date.now();

  if (!adapter) {
    const failed: ExecutionResult = {
      ok: false, taskId: `task_${Date.now()}`, taskType, adapter: "none", mode: "stub", dryRun,
      classification: "failed", retryable: false, requestPayload: payload, output: null,
      error: { code: "ADAPTER_NOT_FOUND", message: "No adapter resolved" }, createdAt: new Date().toISOString(), latencyMs: Date.now() - started
    };
    writeExecutionAudit(failed);
    recordExecution("none", taskType, "stub", false, failed.latencyMs);
    return failed;
  }

  try {
    const result = dryRun && adapter.dryRunExecute ? await adapter.dryRunExecute(payload) : await adapter.execute(payload);
    const normalized: ExecutionResult = {
      ok: result.ok, taskId: `task_${Date.now()}`, taskType, adapter: adapter.name, mode: adapter.kind, dryRun,
      classification: result.classification, retryable: !result.ok && adapter.kind === "real",
      requestPayload: payload, output: result.output, createdAt: new Date().toISOString(), latencyMs: Date.now() - started
    };
    writeExecutionAudit(normalized);
    recordExecution(adapter.name, taskType, adapter.kind, normalized.ok, normalized.latencyMs);
    return normalized;
  } catch (error) {
    const normalized: ExecutionResult = {
      ok: false, taskId: `task_${Date.now()}`, taskType, adapter: adapter.name, mode: adapter.kind, dryRun,
      classification: "failed", retryable: adapter.kind === "real", requestPayload: payload, output: null,
      error: { code: "EXECUTION_FAILURE", message: error instanceof Error ? error.message : "Unknown error" },
      createdAt: new Date().toISOString(), latencyMs: Date.now() - started
    };
    writeExecutionAudit(normalized);
    recordExecution(adapter.name, taskType, adapter.kind, false, normalized.latencyMs);
    return normalized;
  }
}