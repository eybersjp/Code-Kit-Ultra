import type { PlatformAdapter, TaskType } from "../../shared/src/contracts";
import { loadAdapterConfig } from "./config";

export abstract class BaseAdapter implements PlatformAdapter {
  constructor(
    public readonly name: string,
    public readonly kind: "real" | "stub",
    public readonly supportedTaskTypes: TaskType[]
  ) {}

  canHandle(taskType: TaskType): boolean {
    return this.supportedTaskTypes.includes(taskType);
  }

  async validateConfig(): Promise<{ ok: boolean; missing: string[] }> {
    const cfg = loadAdapterConfig().adapters[this.name];
    if (!cfg) return { ok: false, missing: ["missing adapter config"] };
    const missing = cfg.requiredEnv.filter((key) => !process.env[key]);
    if (this.kind === "stub") return { ok: true, missing: [] };
    return { ok: missing.length === 0, missing };
  }

  async healthCheck(): Promise<{ ok: boolean; details: string }> {
    const check = await this.validateConfig();
    if (!check.ok) return { ok: false, details: `Missing env: ${check.missing.join(", ")}` };
    return { ok: true, details: `${this.name} healthy (${this.kind})` };
  }

  abstract execute(payload: unknown): Promise<{ ok: boolean; output: unknown; classification: "simulated" | "executed" | "failed" }>;
}