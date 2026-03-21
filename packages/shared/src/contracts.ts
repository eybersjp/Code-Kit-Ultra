import type { TaskType, GeneratedSkillManifest } from "./types";

export interface PlatformAdapter {
  name: string;
  kind: "real" | "stub";
  supportedTaskTypes: TaskType[];
  healthCheck(): Promise<{ ok: boolean; details: string }>;
  validateConfig(): Promise<{ ok: boolean; missing: string[] }>;
  canHandle(taskType: TaskType): boolean;
  execute(payload: unknown): Promise<{ ok: boolean; output: unknown; classification: "simulated" | "executed" | "failed" }>;
}

export interface SkillDefinition {
  skillId: string;
  name: string;
  description: string;
  triggers: string[];
  taskType: TaskType;
}

export interface SkillPackage {
  manifest: GeneratedSkillManifest;
  skillMarkdown: string;
  generatedPath: string;
}