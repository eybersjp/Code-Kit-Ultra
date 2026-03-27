import type { PlatformAdapter } from "../../shared/src/contracts";
import type { TaskType } from "../../shared/src/types";

class MockAdapter implements PlatformAdapter {
  constructor(
    public name: string,
    private supportedTaskTypes: TaskType[],
    private descriptor: string
  ) {}

  canHandle(taskType: TaskType): boolean {
    return this.supportedTaskTypes.includes(taskType);
  }

  async execute(payload: unknown): Promise<{ summary: string }> {
    const summary = `${this.descriptor}; payload=${JSON.stringify(payload).slice(0, 80)}`;
    return { summary };
  }
}

export const mockAdapters: PlatformAdapter[] = [
  new MockAdapter("cursor-mock", ["planning", "coding"], "Plan-first IDE style execution"),
  new MockAdapter("windsurf-mock", ["coding", "reporting"], "Fast autonomous editor execution"),
  new MockAdapter("antigravity-mock", ["skills", "planning"], "Skill-centric orchestration"),
  new MockAdapter("n8n-mock", ["automation"], "Workflow automation execution"),
  new MockAdapter("windmill-mock", ["automation", "reporting"], "Script-to-job execution"),
  new MockAdapter("fallback-mock", ["planning", "coding", "skills", "automation", "reporting"], "Fallback adapter execution")
];

export function getAdapterByName(name: string): PlatformAdapter | undefined {
  return mockAdapters.find((adapter) => adapter.name === name);
}
