import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveInsForgeSession, mapClaimsToSession } from "./resolve-session";
import { verifyInsForgeToken } from "./verify-insforge-token";

vi.mock("./verify-insforge-token");

describe("resolve-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapClaimsToSession", () => {
    it("should map valid claims to a normalized session", () => {
      const claims = {
         sub: "user-1",
         org_id: "org-1",
         workspace_id: "ws-1",
         project_id: "project-1",
         actor_type: "user",
         roles: ["admin", "operator"],
         name: "Test User",
         iat: 1700000000,
         exp: 1700003600
      };

      const session = mapClaimsToSession(claims);

      expect(session).toEqual({
        actor: {
          actorId: "user-1",
          actorType: "user",
          actorName: "Test User",
          roles: ["admin", "operator"],
        },
        tenant: {
          orgId: "org-1",
          workspaceId: "ws-1",
          projectId: "project-1",
        },
        claims: claims,
        issuedAt: 1700000000,
        expiresAt: 1700003600,
      });
    });

    it("should provide default values for missing fields", () => {
      const claims = { sub: "user-minimal" };
      const session = mapClaimsToSession(claims);

      expect(session.actor.actorId).toBe("user-minimal");
      expect(session.actor.roles).toEqual(["viewer"]);
      expect(session.tenant.orgId).toBe("default-org");
      expect(session.tenant.workspaceId).toBe("default-workspace");
      expect(session.actor.actorName).toBe("user-minimal");
    });
  });

  describe("resolveInsForgeSession", () => {
    it("should verify token and map to session", async () => {
      const mockClaims = { sub: "user-abc", org_id: "org-xyz" };
      (verifyInsForgeToken as any).mockResolvedValue(mockClaims);

      const session = await resolveInsForgeSession("valid-token");

      expect(verifyInsForgeToken).toHaveBeenCalledWith("valid-token");
      expect(session.actor.actorId).toBe("user-abc");
      expect(session.tenant.orgId).toBe("org-xyz");
    });
  });
});
