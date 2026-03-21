import type { TaskType } from "../../shared/src/types";

export interface ExecutionResult {
  ok: boolean;
  taskId: string;
  taskType: TaskType;
  adapter: string;
  mode: "real" | "stub";
  dryRun: boolean;
  classification: "simulated" | "executed" | "failed";
  retryable: boolean;
  requestPayload: unknown;
  output: unknown;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
}