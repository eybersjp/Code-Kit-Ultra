import fs from "node:fs";
import path from "node:path";
import type { ExecutionResult } from "../../adapters/src/execution-result";

function auditPath() {
  return path.resolve(".codekit/audit/execution-audit.log");
}

export function writeExecutionAudit(result: ExecutionResult) {
  const file = auditPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const redacted = {
    at: result.createdAt,
    adapter: result.adapter,
    taskId: result.taskId,
    taskType: result.taskType,
    mode: result.mode,
    dryRun: result.dryRun,
    ok: result.ok,
    classification: result.classification,
    retryable: result.retryable,
    error: result.error ? { code: result.error.code, message: result.error.message } : undefined
  };
  fs.appendFileSync(file, JSON.stringify(redacted) + "\n", "utf-8");
}