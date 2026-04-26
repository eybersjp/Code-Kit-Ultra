import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

// MUST import setup before importing app to ensure mocks are hoisted
import { mockResolveInsForgeSession } from "./setup";
import { app } from "../src/index";
import { ApprovalService } from "../src/services/approval-service";
import { loadRunBundle } from "../../../packages/memory/src/run-store";
const mockApprovalService = vi.mocked(ApprovalService);
const mockLoadRunBundle = vi.mocked(loadRunBundle);

const RUN_ID = "run-123";
const RUN_DIR = path.join(process.cwd(), ".codekit", "runs", RUN_ID);

function ensureRunBundleFixture() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RUN_DIR, "intake.json"),
    JSON.stringify({ runId: RUN_ID, createdAt: new Date().toISOString(), idea: "Test idea", input: { idea: "Test idea" } }, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(RUN_DIR, "plan.json"),
    JSON.stringify({ runId: RUN_ID, createdAt: new Date().toISOString(), summary: "Phase 8 fallback plan", selectedSkills: [], tasks: [] }, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(RUN_DIR, "state.json"),
    JSON.stringify(
      {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStepIndex: 0,
        status: "paused",
        approvalRequired: false,
        approved: false,
        orgId: "org-1",
        workspaceId: "ws-1",
        projectId: "proj-1",
        actorId: "admin-1",
        actorType: "user",
        correlationId: "corr-1",
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function cleanupRunBundleFixture() {
  if (fs.existsSync(RUN_DIR)) {
    fs.rmSync(RUN_DIR, { recursive: true, force: true });
  }
}

describe("Control Service: retry and rollback endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupRunBundleFixture();
    mockLoadRunBundle.mockReturnValue({
      intake: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        idea: "Test idea",
        input: { idea: "Test idea" },
      },
      plan: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        summary: "Phase 8 fallback plan",
        selectedSkills: [],
        tasks: [],
      },
      state: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStepIndex: 0,
        status: "paused",
        approvalRequired: false,
        approved: false,
        orgId: "org-1",
        workspaceId: "ws-1",
        projectId: "proj-1",
        actorId: "admin-1",
        actorType: "user",
        correlationId: "corr-1",
      },
      gates: [],
      adapters: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        executions: [],
      },
      executionLog: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        steps: [],
      },
      auditLog: {
        runId: RUN_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        events: [],
      },
      reportMarkdown: "",
    });
  });

  afterEach(() => {
    cleanupRunBundleFixture();
  });

  it("allows operator to retry a step", async () => {
    mockResolveInsForgeSession.mockResolvedValue({
      actor: { actorId: "op-1", actorType: "user", actorName: "Operator", roles: ["operator"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1" },
    });
    mockApprovalService.retry.mockResolvedValue({});

    const response = await request(app)
      .post(`/v1/runs/${RUN_ID}/retry-step`)
      .set("Authorization", "Bearer operator-token")
      .send({ stepId: "step-1" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("retrying");
    expect(ApprovalService.retry).toHaveBeenCalledWith(RUN_ID, "step-1", expect.any(String));
  });

  it("forbids reviewer from retrying a step", async () => {
    mockResolveInsForgeSession.mockResolvedValue({
      actor: { actorId: "rev-1", actorType: "user", actorName: "Reviewer", roles: ["reviewer"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1" },
    });

    const response = await request(app)
      .post(`/v1/runs/${RUN_ID}/retry-step`)
      .set("Authorization", "Bearer reviewer-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Missing one of the required permissions");
    expect(ApprovalService.retry).not.toHaveBeenCalled();
  });

  it("allows admin to rollback a step", async () => {
    ensureRunBundleFixture();

    mockResolveInsForgeSession.mockResolvedValue({
      actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
    });
    mockApprovalService.rollback.mockResolvedValue({});

    const response = await request(app)
      .post(`/v1/runs/${RUN_ID}/rollback-step`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("rolled-back");
    expect(ApprovalService.rollback).toHaveBeenCalledWith(RUN_ID, undefined, expect.any(String));
  });

  it("forbids operator from rollback when not authorized", async () => {
    ensureRunBundleFixture();

    mockResolveInsForgeSession.mockResolvedValue({
      actor: { actorId: "op-1", actorType: "user", actorName: "Operator", roles: ["operator"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1" },
    });

    const response = await request(app)
      .post(`/v1/runs/${RUN_ID}/rollback-step`)
      .set("Authorization", "Bearer operator-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Missing one of the required permissions");
    expect(ApprovalService.rollback).not.toHaveBeenCalled();
  });
});
