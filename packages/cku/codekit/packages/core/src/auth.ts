import type { AuthUser, Role } from "../../shared/src/types";

// Mock API Key store for MVP. In production, this would be a database or identity provider.
const API_KEYS: Record<string, AuthUser> = {
  "admin-key": { id: "local-admin", role: "admin", apiKeyId: "admin-key" },
  "operator-key": { id: "local-operator", role: "operator", apiKeyId: "operator-key" },
  "reviewer-key": { id: "local-reviewer", role: "reviewer", apiKeyId: "reviewer-key" },
  "viewer-key": { id: "local-viewer", role: "viewer", apiKeyId: "viewer-key" },
};

export function resolveApiKeyUser(apiKey?: string | null): AuthUser | null {
  if (!apiKey) return null;

  // Global override for automation/CI
  const envKey = process.env.CODEKIT_ADMIN_API_KEY;
  if (envKey && apiKey === envKey) {
    return { id: "env-admin", role: "admin", apiKeyId: "env-admin" };
  }

  return API_KEYS[apiKey] ?? null;
}

export function canUser(user: AuthUser | null, allowed: Role[]): boolean {
  return !!user && allowed.includes(user.role);
}

export function assertRole(user: AuthUser | null, allowed: Role[]): asserts user is AuthUser {
  if (!canUser(user, allowed)) {
    throw new Error(`Forbidden. Requires one of: ${allowed.join(", ")}`);
  }
}
