export interface PlatformAdapter {
  name: string;
  canHandle(taskType: string): boolean;
  execute(payload: unknown): Promise<unknown>;
}

export interface SkillDefinition {
  skillId: string;
  name: string;
  description: string;
  triggers: string[];
}
