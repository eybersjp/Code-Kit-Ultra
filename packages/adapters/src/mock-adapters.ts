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
  new MockAdapter("antigravity-mock", ["skills"], "Skill-centric orchestration"),
  new MockAdapter("n8n-mock", ["automation"], "Workflow automation execution"),
  new MockAdapter("windmill-mock", ["automation", "reporting"], "Script-to-job execution")
];

export function pickAdapter(taskType: TaskType): PlatformAdapter {
  const found = mockAdapters.find((adapter) => adapter.canHandle(taskType));
  if (!found) {
    return new MockAdapter("fallback-mock", [taskType], "Fallback adapter execution");
  }
  return found;
}
