import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { ServiceAccountAuth } from "./service-account";
import type { ServiceAccount } from "./service-account";

const TEST_SECRET = "test-sa-secret-for-unit-tests";

const mockServiceAccount: ServiceAccount = {
  id: "sa-001",
  name: "ci-bot",
  orgId: "org-test",
  workspaceId: "ws-test",
  projectId: "proj-test",
  roles: ["operator", "viewer"],
  metadata: { env: "test" },
};

describe("ServiceAccountAuth", () => {
  beforeEach(() => {
    vi.stubEnv("CKU_SERVICE_ACCOUNT_SECRET", TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("issueToken", () => {
    it("TC-SA-001: issueToken returns a signed JWT string", () => {
      const token = ServiceAccountAuth.issueToken(mockServiceAccount);

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("TC-SA-002: token payload has correct orgId, scopes (roles), and sub", () => {
      const token = ServiceAccountAuth.issueToken(mockServiceAccount);
      const decoded = jwt.decode(token) as Record<string, any>;

      expect(decoded).not.toBeNull();
      expect(decoded.sub).toBe("sa-001");
      expect(decoded.orgId).toBe("org-test");
      expect(decoded.workspaceId).toBe("ws-test");
      expect(decoded.projectId).toBe("proj-test");
      expect(decoded.roles).toEqual(["operator", "viewer"]);
      expect(decoded.name).toBe("ci-bot");
      expect(decoded.type).toBe("service_account");
    });

    it("TC-SA-003: token expires at the correct time for a given expiresIn", () => {
      // Issue a token that expires in 1 hour
      const before = Math.floor(Date.now() / 1000);
      const token = ServiceAccountAuth.issueToken(mockServiceAccount, "1h");
      const after = Math.floor(Date.now() / 1000);

      const decoded = jwt.decode(token) as Record<string, any>;
      expect(decoded.exp).toBeGreaterThanOrEqual(before + 3600);
      expect(decoded.exp).toBeLessThanOrEqual(after + 3600 + 2);
    });

    it("default expiry is 30 days", () => {
      const before = Math.floor(Date.now() / 1000);
      const token = ServiceAccountAuth.issueToken(mockServiceAccount);
      const after = Math.floor(Date.now() / 1000);

      const decoded = jwt.decode(token) as Record<string, any>;
      const thirtyDays = 30 * 24 * 3600;
      expect(decoded.exp).toBeGreaterThanOrEqual(before + thirtyDays);
      expect(decoded.exp).toBeLessThanOrEqual(after + thirtyDays + 2);
    });
  });

  describe("verifyToken", () => {
    it("TC-SA-004: verifyToken returns a ResolvedSession for a valid token", async () => {
      const token = ServiceAccountAuth.issueToken(mockServiceAccount);
      const session = await ServiceAccountAuth.verifyToken(token);

      expect(session.actor.actorId).toBe("sa-001");
      expect(session.actor.actorType).toBe("service_account");
      expect(session.actor.actorName).toBe("ci-bot");
      expect(session.actor.roles).toEqual(["operator", "viewer"]);
      expect(session.tenant.orgId).toBe("org-test");
      expect(session.tenant.workspaceId).toBe("ws-test");
      expect(session.tenant.projectId).toBe("proj-test");
      expect(session.claims).toBeDefined();
      expect(session.issuedAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
    });

    it("TC-SA-005: expired token throws/rejects", async () => {
      // Sign with an already-expired token using the real secret read at module load time
      // We need to use the same secret the module uses. Since stubEnv is set before the
      // module was imported, CKU_SERVICE_ACCOUNT_SECRET may already be set. Use jwt.sign
      // directly with the known test secret.
      const expiredToken = jwt.sign(
        {
          sub: "sa-001",
          name: "ci-bot",
          orgId: "org-test",
          workspaceId: "ws-test",
          roles: ["operator"],
          type: "service_account",
        },
        TEST_SECRET,
        { expiresIn: -1 }
      );

      await expect(ServiceAccountAuth.verifyToken(expiredToken)).rejects.toThrow(
        /Service Account verification failed/
      );
    });

    it("TC-SA-007: token signed with wrong secret fails verification", async () => {
      const badToken = jwt.sign(
        {
          sub: "sa-002",
          name: "evil-bot",
          orgId: "org-x",
          workspaceId: "ws-x",
          roles: ["admin"],
          type: "service_account",
        },
        "totally-wrong-secret",
        { expiresIn: "1h" }
      );

      await expect(ServiceAccountAuth.verifyToken(badToken)).rejects.toThrow(
        /Service Account verification failed/
      );
    });
  });

  describe("isServiceAccountToken", () => {
    it("TC-SA-006: returns true for service account tokens", () => {
      const token = ServiceAccountAuth.issueToken(mockServiceAccount);
      expect(ServiceAccountAuth.isServiceAccountToken(token)).toBe(true);
    });

    it("TC-SA-006: returns false for a regular user JWT (no type field)", () => {
      // A plain user token won't have type: "service_account"
      const userToken = jwt.sign(
        { sub: "user-123", org_id: "org-test", roles: ["viewer"] },
        "any-secret",
        { expiresIn: "1h" }
      );
      expect(ServiceAccountAuth.isServiceAccountToken(userToken)).toBe(false);
    });

    it("returns false for a malformed token string", () => {
      expect(ServiceAccountAuth.isServiceAccountToken("not.a.real.token")).toBe(false);
    });
  });
});
