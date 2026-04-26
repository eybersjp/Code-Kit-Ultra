import { vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { ROLE_PERMISSIONS, ROLE_ALIASES } from "../../../packages/policy/src/role-mapping.js";

// Mock verifyRevocation middleware - pass through all requests
vi.mock("../src/middleware/verify-revocation.js", () => ({
  verifyRevocation: (req: Request, res: Response, next: NextFunction) => {
    return next();
  },
}));

// Mock resolveInsForgeSession with default implementation for known tokens
// Tests can override with mockResolvedValueOnce or mockResolvedValue
const defaultSessionMap: Record<string, any> = {
  "admin-token": {
    actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
  },
  "operator-token": {
    actor: { actorId: "op-1", actorType: "user", actorName: "Operator", roles: ["operator"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  },
  "reviewer-token": {
    actor: { actorId: "rev-1", actorType: "user", actorName: "Reviewer", roles: ["reviewer"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  },
  "viewer-token": {
    actor: { actorId: "viewer-1", actorType: "user", actorName: "Viewer", roles: ["viewer"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  },
};

export const mockResolveInsForgeSession = vi.fn((token: string) => {
  const session = defaultSessionMap[token];
  if (session) return Promise.resolve(session);
  return Promise.reject(new Error('Invalid token'));
});

vi.mock("../../../packages/auth/src/resolve-session.js", () => ({
  resolveInsForgeSession: mockResolveInsForgeSession,
}));

vi.mock("../../../packages/auth/src/service-account.js", () => ({
  ServiceAccountAuth: {
    isServiceAccountToken: vi.fn(() => false),
    verifyToken: vi.fn(),
  },
}));

// Mock resolveApiKeyUser - default returns null, tests can override
vi.mock("../../../packages/core/src/auth.js", () => ({
  resolveApiKeyUser: vi.fn(async (apiKey: string) => {
    // Default: legacy-key is supported
    if (apiKey === "legacy-key") {
      return { id: "legacy-user", role: "admin" };
    }
    return null;
  }),
}));

vi.mock("../../../packages/policy/src/index.js", () => ({
  resolvePermissions: vi.fn((roles: string[]) => {
    const permissions = new Set<string>();
    for (const role of roles) {
      // Normalize role through aliases (e.g., "Admin" → "admin")
      const normalizedRole = ROLE_ALIASES[role] || role;
      const rolePerms = ROLE_PERMISSIONS[normalizedRole];
      if (rolePerms) {
        rolePerms.forEach(perm => permissions.add(perm));
      }
    }
    return Array.from(permissions);
  }),
}));

vi.mock("../../../packages/orchestrator/src");

vi.mock("../../../packages/memory/src/run-store.js", () => ({
  loadRunBundle: vi.fn(),
  updateIntake: vi.fn(),
  updatePlan: vi.fn(),
  updateRunState: vi.fn(),
}));

vi.mock("../../../packages/audit/src/index.js", () => ({
  writeAuditEvent: vi.fn(),
}));

vi.mock("../src/events/dispatcher.js", () => ({
  emitRunCreated: vi.fn(),
}));

vi.mock("../src/services/approval-service", () => ({
  ApprovalService: {
    retry: vi.fn(),
    rollback: vi.fn(),
  },
}));
