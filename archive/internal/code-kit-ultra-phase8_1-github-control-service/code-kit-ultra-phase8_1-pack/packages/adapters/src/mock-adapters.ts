import type { PlatformAdapter } from "../../shared/src/contracts";

class BaseMockAdapter implements PlatformAdapter {
  constructor(public readonly name: string, private readonly acceptedTaskTypes: string[]) {}

  canHandle(taskType: string): boolean {
    return this.acceptedTaskTypes.includes(taskType);
  }

  async execute(payload: unknown): Promise<unknown> {
    return {
      adapter: this.name,
      status: "simulated",
      payload,
      message: `${this.name} simulated execution successfully.`,
    };
  }
}

export function createMockAdapters(): PlatformAdapter[] {
  return [
    new BaseMockAdapter("CursorMock", ["analysis", "planning", "reporting"]),
    new BaseMockAdapter("WindsurfMock", ["clarification", "skill-selection"]),
    new BaseMockAdapter("AntigravityMock", ["governance", "mock-execution"]),
    new BaseMockAdapter("n8nMock", ["automation"]),
    new BaseMockAdapter("WindmillMock", ["deployment"]),
  ];
}
