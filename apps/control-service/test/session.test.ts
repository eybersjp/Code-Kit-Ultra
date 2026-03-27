import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { resolveInsForgeSession } from "../../../packages/auth/src/resolve-session";
import { resolveApiKeyUser } from "../../../packages/core/src/auth";

vi.mock("../../../packages/auth/src/resolve-session");
vi.mock("../../../packages/core/src/auth");

describe("Control Service: /v1/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CKU_LEGACY_API_KEYS_ENABLED = "true";
  });

  it("should return session info with valid bearer auth", async () => {
    const mockSession = {
      actor: { actorId: "user-1", actorType: "user", actorName: "Test User", roles: ["admin"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1" },
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    };
    (resolveInsForgeSession as any).mockResolvedValue(mockSession);

    const response = await request(app)
      .get("/v1/session")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.actor.actorId).toBe("user-1");
    expect(response.body.authMode).toBe("bearer_session");
    expect(response.body.permissions).toEqual(expect.any(Array));
    expect(resolveInsForgeSession).toHaveBeenCalledWith("valid-token");
  });

  it("should return session info with legacy API key", async () => {
    const mockLegacyUser = { id: "legacy-user", role: "admin" };
    (resolveApiKeyUser as any).mockReturnValue(mockLegacyUser);

    const response = await request(app)
      .get("/v1/session")
      .set("x-api-key", "legacy-key");

    expect(response.status).toBe(200);
    expect(response.body.actor.actorId).toBe("legacy-user");
    expect(response.body.actor.actorType).toBe("legacy_api_key");
    expect(response.body.tenant.orgId).toBe("default");
  });

  it("should reject invalid bearer token", async () => {
    (resolveInsForgeSession as any).mockRejectedValue(new Error("invalid token"));

    const response = await request(app)
      .get("/v1/session")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("invalid token");
  });

  it("should reject missing auth", async () => {
    const response = await request(app).get("/v1/session");
    expect(response.status).toBe(401);
    expect(response.body.error).toContain("No valid bearer token or API key");
  });
});
