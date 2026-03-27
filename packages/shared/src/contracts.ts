import type { TaskType, GeneratedSkillManifest } from "./types";
export type { TaskType, GeneratedSkillManifest };

export interface PlatformAdapter {
  name: string;
  kind: "real" | "stub";
  supportedTaskTypes: TaskType[];
  healthCheck(): Promise<{ ok: boolean; details: string }>;
  validateConfig(): Promise<{ ok: boolean; missing: string[] }>;
  canHandle(taskType: TaskType): boolean;
  dryRunExecute?(payload: unknown): Promise<{ ok: boolean; output: unknown; classification: "simulated" | "executed" | "failed" }>;
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

export interface AuthProvider {
  resolveSession(token: string): Promise<import("./types").ResolvedSession>;
  verifyToken(token: string): Promise<Record<string, unknown>>;
}

export interface TokenVerifier {
  verify(token: string): Promise<Record<string, unknown>>;
}

export interface ExecutionTokenIssuer {
  issue(scope: import("./types").ExecutionScope): Promise<string>;
}

export interface PermissionResolver {
  hasPermission(session: import("./types").ResolvedSession, permission: string): Promise<boolean>;
}

export interface TenantResolver {
  resolve(claims: Record<string, unknown>): Promise<import("./types").TenantContext>;
}
