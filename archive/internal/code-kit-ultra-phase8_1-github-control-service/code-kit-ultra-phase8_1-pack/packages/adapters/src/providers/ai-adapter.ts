import type { ProviderAdapter } from "../base/provider-adapter";

export class AiAdapter implements ProviderAdapter {
  id = "ai";
  description = "Provider stub for future AI platform execution.";

  async validate(): Promise<boolean> {
    return true;
  }

  async execute(input: unknown) {
    return {
      success: true,
      output: `AI adapter produced a deterministic mock result for ${JSON.stringify(input)}`,
    };
  }
}
