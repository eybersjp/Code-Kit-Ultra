import type { TaskType } from "./types";

export interface PlatformAdapter {
  name: string;
  canHandle(taskType: TaskType): boolean;
  execute(payload: unknown): Promise<{ summary: string }>;
}

export interface SkillDefinition {
  skillId: string;
  name: string;
  description: string;
  triggers: string[];
}
