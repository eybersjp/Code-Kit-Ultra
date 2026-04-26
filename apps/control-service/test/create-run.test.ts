import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// MUST import setup before importing app to ensure mocks are hoisted
import { mockResolveInsForgeSession } from "./setup";
import { app } from "../src/index";

const defaultSessionMap: Record<string, any> = {
  "admin-token": {
    actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
  },
  "operator-token": {
    actor: { actorId: "op-1", actorType: "user", actorName: "Operator", roles: ["operator"] },
    tenant: { orgId: "org-1", workspaceId: "ws-1" },
  },
};
import { runVerticalSlice } from "../../../packages/orchestrator/src";
import { loadRunBundle, updateIntake, updatePlan, updateRunState } from "../../../packages/memory/src/run-store.js";
import { writeAuditEvent } from "../../../packages/audit/src/index.js";
import { emitRunCreated } from "../src/events/dispatcher.js";
const mockRunVerticalSlice = vi.mocked(runVerticalSlice);
const mockLoadRunBundle = vi.mocked(loadRunBundle);
const mockUpdateIntake = vi.mocked(updateIntake);
const mockUpdatePlan = vi.mocked(updatePlan);
const mockUpdateRunState = vi.mocked(updateRunState);
const mockWriteAuditEvent = vi.mocked(writeAuditEvent);
const mockEmitRunCreated = vi.mocked(emitRunCreated);

describe("Control Service: /runs create path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when run creation session lacks project scope", async () => {
    mockResolveInsForgeSession.mockImplementation(async (token: string) => {
      if (token === "admin-token") {
        return {
          actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
          tenant: { orgId: "org-1", workspaceId: "ws-1" },
        };
      }
      throw new Error("invalid token");
    });

    const response = await request(app)
      .post("/v1/runs")
      .set("Authorization", "Bearer admin-token")
      .send({ idea: "Create a SaaS portal" });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Run creation requires a project scope");
  });

  it("creates a run when project scope is present", async () => {
    mockResolveInsForgeSession.mockImplementation(async (token: string) => {
      if (token === "admin-token") {
        return {
          actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
          tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
        };
      }
      throw new Error("invalid token");
    });

    mockLoadRunBundle.mockReturnValueOnce(null);
    mockRunVerticalSlice.mockResolvedValueOnce({
      report: {
        id: "run-abc",
        createdAt: "2026-01-01T00:00:00.000Z",
        input: { idea: "Create a SaaS portal", mode: undefined, dryRun: undefined },
        assumptions: [],
        clarifyingQuestions: [],
        selectedSkills: [],
        overallGateStatus: "pending",
        currentPhase: "intake",
        completedPhases: [],
        status: "in-progress",
      },
      artifactDirectory: "/tmp/run-abc",
      artifactReportPath: "/tmp/run-abc/report.json",
      memoryPath: "/tmp/run-abc/memory.json",
      overallGateStatus: "pending",
      currentPhase: "intake",
    } as any);

    const response = await request(app)
      .post("/v1/runs")
      .set("Authorization", "Bearer admin-token")
      .send({ idea: "Create a SaaS portal" });

    expect(response.status).toBe(201);
    expect(response.body.runId).toBe("run-abc");
    expect(response.body.correlationId).toBeDefined();
    expect(mockWriteAuditEvent).toHaveBeenCalled();
    expect(mockEmitRunCreated).toHaveBeenCalled();
  });
});
