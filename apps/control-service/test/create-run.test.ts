import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { resolveInsForgeSession } from "../../../packages/auth/src/resolve-session.js";
import { runVerticalSlice } from "../../../packages/orchestrator/src";
import { loadRunBundle, updateIntake, updatePlan, updateRunState } from "../../../packages/memory/src/run-store.js";
import { writeAuditEvent } from "../../../packages/audit/src/index.js";
import { emitRunCreated } from "../src/events/dispatcher.js";

vi.mock("../../../packages/auth/src/resolve-session.js", () => ({
  resolveInsForgeSession: vi.fn(),
}));
vi.mock("../../../packages/orchestrator/src", () => ({
  runVerticalSlice: vi.fn(),
}));
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

const mockResolveInsForgeSession = vi.mocked(resolveInsForgeSession);
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
    mockResolveInsForgeSession.mockResolvedValueOnce({
      actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1" },
    } as any);

    const response = await request(app)
      .post("/runs")
      .set("Authorization", "Bearer admin-token")
      .send({ idea: "Create a SaaS portal" });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Run creation requires a project scope");
  });

  it("creates a run when project scope is present", async () => {
    mockResolveInsForgeSession.mockResolvedValueOnce({
      actor: { actorId: "admin-1", actorType: "user", actorName: "Admin", roles: ["admin"] },
      tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
    } as any);

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
      .post("/runs")
      .set("Authorization", "Bearer admin-token")
      .send({ idea: "Create a SaaS portal" });

    expect(response.status).toBe(201);
    expect(response.body.runId).toBe("run-abc");
    expect(response.body.correlationId).toBeDefined();
    expect(mockWriteAuditEvent).toHaveBeenCalled();
    expect(mockEmitRunCreated).toHaveBeenCalled();
  });
});
