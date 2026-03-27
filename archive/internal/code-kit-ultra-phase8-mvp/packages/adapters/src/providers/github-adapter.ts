import type { ProviderAdapter } from "../base/provider-adapter";

export class GithubAdapter implements ProviderAdapter {
  id = "github";
  description = "Provider stub for future GitHub execution.";

  async validate(): Promise<boolean> {
    return true;
  }

  async execute(input: unknown) {
    return {
      success: true,
      output: `GitHub adapter staged mock action: ${JSON.stringify(input)}`,
    };
  }
}
