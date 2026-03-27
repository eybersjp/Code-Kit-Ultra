import type { AdapterHealth, TaskType } from "../../shared/src/types";
import type { PlatformAdapter } from "../../shared/src/contracts";

export abstract class BaseAdapter implements PlatformAdapter {
  constructor(
    public readonly name: string,
    protected readonly capabilities: TaskType[],
    protected readonly descriptor: string,
    protected readonly configured = true,
  ) {}

  canHandle(taskType: TaskType): boolean {
    return this.capabilities.includes(taskType);
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapter: this.name,
      ok: true,
      configured: this.configured,
      capabilities: this.capabilities,
      message: `${this.name} is available in stub mode.`
    };
  }

  async validateConfig(): Promise<{ valid: boolean; message: string }> {
    return {
      valid: this.configured,
      message: this.configured ? `${this.name} configuration valid.` : `${this.name} missing configuration.`
    };
  }

  async execute(payload: unknown): Promise<{ summary: string; classifiedFailure?: string }> {
    return {
      summary: `${this.descriptor}; payload=${JSON.stringify(payload).slice(0, 120)}`
    };
  }
}
