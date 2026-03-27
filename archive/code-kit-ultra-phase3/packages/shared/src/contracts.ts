import type { GeneratedSkillManifest, TaskType } from "./types";

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

export interface RoutingPolicy {
  taskType: TaskType;
  preferred: string[];
}

export interface RoutingPolicyConfig {
  defaultAdapter: string;
  routingPolicies: RoutingPolicy[];
}

export interface SkillManifestValidator {
  validate(manifest: GeneratedSkillManifest): {
    valid: boolean;
    errors: string[];
  };
}
