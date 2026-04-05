import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { issueExecutionToken } from "./issue-execution-token";
import type { ExecutionScope } from "../../shared/src/types";

const TEST_SECRET = "test-execution-secret-for-unit-tests";

const mockScope: ExecutionScope = {
  runId: "run-abc-123",
  correlationId: "corr-xyz-456",
  actor: {
    actorId: "actor-001",
    actorType: "service_account",
    actorName: "test-bot",
    roles: ["operator"],
  },
  tenant: {
    orgId: "org-test",
    workspaceId: "ws-test",
    projectId: "proj-test",
  },
};

describe("issueExecutionToken", () => {
  beforeEach(() => {
    vi.stubEnv("INSFORGE_SERVICE_ROLE_KEY", TEST_SECRET);
    vi.stubEnv("INSFORGE_JWT_ISSUER", "code-kit-ultra-internal");
    vi.stubEnv("INSFORGE_JWT_AUDIENCE", "execution-engine-worker");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TC-EXEC-001: issues a valid HS256 JWT for a given runId and orgId", async () => {
    const token = await issueExecutionToken(mockScope);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    expect(header.alg).toBe("HS256");
  });

  it("TC-EXEC-002: token payload contains correct runId, orgId, and audience fields", async () => {
    const token = await issueExecutionToken(mockScope);
    const decoded = jwt.decode(token) as Record<string, any>;

    expect(decoded).not.toBeNull();
    expect(decoded.run_id).toBe("run-abc-123");
    expect(decoded.org_id).toBe("org-test");
    expect(decoded.aud).toBe("execution-engine-worker");
    expect(decoded.sub).toBe("actor-001");
    expect(decoded.workspace_id).toBe("ws-test");
    expect(decoded.project_id).toBe("proj-test");
    expect(decoded.actor_type).toBe("service_account");
    expect(decoded.correlation_id).toBe("corr-xyz-456");
    expect(decoded.roles).toEqual(["operator"]);
  });

  it("TC-EXEC-003: token expires in ~10 minutes (exp close to iat + 600)", async () => {
    const token = await issueExecutionToken(mockScope);
    const decoded = jwt.decode(token) as Record<string, any>;

    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();

    const diff = decoded.exp - decoded.iat;
    // Should be ~600 seconds (10 minutes), allow ±5s tolerance
    expect(diff).toBeGreaterThanOrEqual(595);
    expect(diff).toBeLessThanOrEqual(605);
  });

  it("TC-EXEC-004: token with wrong secret fails verification", async () => {
    const token = await issueExecutionToken(mockScope);

    expect(() =>
      jwt.verify(token, "wrong-secret", { algorithms: ["HS256"] })
    ).toThrow();
  });

  it("TC-EXEC-005: expired token fails verification", async () => {
    // Issue a token that is already expired by backdating iat/exp
    const expiredToken = jwt.sign(
      {
        sub: mockScope.actor.actorId,
        run_id: mockScope.runId,
        org_id: mockScope.tenant.orgId,
      },
      TEST_SECRET,
      {
        algorithm: "HS256",
        issuer: "code-kit-ultra-internal",
        audience: "execution-engine-worker",
        expiresIn: -1, // expired 1 second ago
      }
    );

    expect(() =>
      jwt.verify(expiredToken, TEST_SECRET, {
        algorithms: ["HS256"],
        issuer: "code-kit-ultra-internal",
        audience: "execution-engine-worker",
      })
    ).toThrow(/expired/i);
  });

  it("TC-EXEC-006: token audience is a scoped execution value", async () => {
    const token = await issueExecutionToken(mockScope);
    const decoded = jwt.decode(token) as Record<string, any>;

    // The audience must be a non-empty scoped value
    expect(decoded.aud).toBeDefined();
    expect(typeof decoded.aud === "string" || Array.isArray(decoded.aud)).toBe(true);

    const aud = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;
    expect(aud.length).toBeGreaterThan(0);
    // Defaults to "execution-engine-worker" when env is set
    expect(aud).toBe("execution-engine-worker");
  });

  it("throws when INSFORGE_SERVICE_ROLE_KEY is not set", async () => {
    vi.stubEnv("INSFORGE_SERVICE_ROLE_KEY", "");

    await expect(issueExecutionToken(mockScope)).rejects.toThrow(
      /INSFORGE_SERVICE_ROLE_KEY/
    );
  });
});
