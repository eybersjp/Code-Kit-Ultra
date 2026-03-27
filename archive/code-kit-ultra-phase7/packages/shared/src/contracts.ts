import type { TaskType } from "./types";
export type { TaskType };

export interface PlatformAdapter {
  name: string;
  kind: "real" | "stub";
  supportedTaskTypes: TaskType[];
  healthCheck(): Promise<{ ok: boolean; details: string }>;
  validateConfig(): Promise<{ ok: boolean; missing: string[] }>;
  canHandle(taskType: TaskType): boolean;
  dryRunExecute?(payload: unknown): Promise<{ ok: boolean; output: unknown; classification: "simulated" | "executed" | "failed" }>;
  execute(payload: unknown): Promise<{ ok: boolean; output: unknown; classification: "simulated" | "executed" | "failed" }>;
}