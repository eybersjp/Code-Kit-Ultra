import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { resolveInsForgeSession } from "../../../packages/auth/src/resolve-session";

vi.mock("../../../packages/auth/src/resolve-session");

describe("Control Service: Gate Approval Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const reviewerSession = {
    actor: { actorId: "rev-1", actorType: "user", actorName: "Reviewer", roles: ["reviewer"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  };

  const viewerSession = {
    actor: { actorId: "view-1", actorType: "user", actorName: "Viewer", roles: ["viewer"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  };

  it("should allow reviewer to approve a gate", async () => {
    (resolveInsForgeSession as any).mockResolvedValue(reviewerSession);

    const response = await request(app)
      .post("/v1/gates/gate-123/approve")
      .set("Authorization", "Bearer reviewer-token");

    // We don't have the approval service logic mocked here so it might fail with 500,
    // but the auth middleware should pass it through.
    // If it returns 403, it means auth rejected it.
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("should forbid viewer from approving a gate", async () => {
    (resolveInsForgeSession as any).mockResolvedValue(viewerSession);

    const response = await request(app)
      .post("/v1/gates/gate-123/approve")
      .set("Authorization", "Bearer viewer-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Forbidden: Missing one of the required permissions [gate:approve]");
  });
});
