import type { ProviderAdapter } from "../base/provider-adapter";

export class ApiAdapter implements ProviderAdapter {
  id = "api";
  description = "Provider stub for future external API execution.";

  async validate(): Promise<boolean> {
    return true;
  }

  async execute(input: unknown) {
    return {
      success: true,
      output: `API adapter staged mock action: ${JSON.stringify(input)}`,
    };
  }
}
