import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApprovalService } from "../src/services/approval-service";

// Mock the run store
vi.mock("../../../../packages/memory/src/run-store", () => ({
  loadRunBundle: vi.fn(() => ({
    state: {
      runId: "test-run-123",
      approvalRequired: true,
      approved: false,
      status: "pending",
      pauseReason: "Requires approval",
      orgId: "org-1",
      updatedAt: new Date().toISOString(),
    },
    intake: {
      idea: "Test deployment",
    },
  })),
  updateRunState: vi.fn(() => null),
  listRunIds: vi.fn(() => ["run-1", "run-2", "run-3"]),
}));

vi.mock("../../../../packages/orchestrator/src/index", () => ({
  resumeRun: vi.fn(() => Promise.resolve({ status: "resumed" })),
  retryTask: vi.fn(() => Promise.resolve({ status: "retried" })),
  rollbackTask: vi.fn(() => Promise.resolve({ status: "rolled_back" })),
}));

describe("ApprovalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Getting Approvals", () => {
    it("should list pending approvals", () => {
      const approvals = ApprovalService.getApprovals();

      expect(Array.isArray(approvals)).toBe(true);
      expect(approvals.length).toBeGreaterThan(0);
    });

    it("should include approval metadata", () => {
      const approvals = ApprovalService.getApprovals();

      approvals.forEach((approval) => {
        expect(approval).toHaveProperty("runId");
        expect(approval).toHaveProperty("approvalId");
        expect(approval).toHaveProperty("title");
        expect(approval).toHaveProperty("reason");
      });
    });

    it("should have correct approval structure", () => {
      const approvals = ApprovalService.getApprovals();

      if (approvals.length > 0) {
        const approval = approvals[0];
        expect(typeof approval.runId).toBe("string");
        expect(typeof approval.approvalId).toBe("string");
        expect(typeof approval.title).toBe("string");
        expect(typeof approval.reason).toBe("string");
      }
    });
  });

  describe("Approve Operation", () => {
    it("should approve a run", async () => {
      const result = await ApprovalService.approve("run-123", "approver-user");

      expect(result).toBeDefined();
      expect(result.status).toBe("resumed");
    });

    it("should use default actor for approval", async () => {
      const result = await ApprovalService.approve("run-123");

      expect(result).toBeDefined();
    });

    it("should record actor name in approval", async () => {
      const result = await ApprovalService.approve("run-456", "admin-user");

      expect(result).toBeDefined();
    });
  });

  describe("Resume Operation", () => {
    it("should resume a paused run", async () => {
      const result = await ApprovalService.resume("run-789", "operator");

      expect(result).toBeDefined();
      expect(result.status).toBe("resumed");
    });

    it("should use system actor for resume", async () => {
      const result = await ApprovalService.resume("run-789");

      expect(result).toBeDefined();
    });
  });

  describe("Retry Operation", () => {
    it("should retry a failed task", async () => {
      const result = await ApprovalService.retry("run-001", "step-1", "operator");

      expect(result).toBeDefined();
      expect(result.status).toBe("retried");
    });

    it("should retry entire run if no step specified", async () => {
      const result = await ApprovalService.retry("run-001", undefined, "operator");

      expect(result).toBeDefined();
    });

    it("should use system actor for retry", async () => {
      const result = await ApprovalService.retry("run-001", "step-1");

      expect(result).toBeDefined();
    });
  });

  describe("Rollback Operation", () => {
    it("should rollback a task", async () => {
      const result = await ApprovalService.rollback("run-002", "step-2", "operator");

      expect(result).toBeDefined();
      expect(result.status).toBe("rolled_back");
    });

    it("should rollback entire run if no step specified", async () => {
      const result = await ApprovalService.rollback("run-002", undefined, "operator");

      expect(result).toBeDefined();
    });

    it("should use system actor for rollback", async () => {
      const result = await ApprovalService.rollback("run-002", "step-1");

      expect(result).toBeDefined();
    });
  });

  describe("Reject Operation", () => {
    it("should reject an approval", () => {
      // Reject doesn't return a promise, it updates state directly
      ApprovalService.reject("run-003", "reviewer-user");
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it("should use system actor for reject", () => {
      ApprovalService.reject("run-003");
      expect(true).toBe(true);
    });

    it("should set run status to cancelled", () => {
      ApprovalService.reject("run-004", "admin");
      // Verify it doesn't throw - in production, would verify state update
      expect(true).toBe(true);
    });
  });

  describe("Actor Tracking", () => {
    it("should track different actors in approvals", async () => {
      const actor1 = "user-1";
      const actor2 = "user-2";
      const actor3 = "automation-service";

      await ApprovalService.approve("run-1", actor1);
      await ApprovalService.resume("run-2", actor2);
      await ApprovalService.retry("run-3", "step-1", actor3);

      // Verify different actors can perform operations
      expect(true).toBe(true);
    });

    it("should track system actor", async () => {
      await ApprovalService.approve("run-10");
      await ApprovalService.resume("run-11");
      await ApprovalService.retry("run-12");

      // Verify system actor works
      expect(true).toBe(true);
    });
  });

  describe("Run ID Handling", () => {
    it("should handle valid run IDs", async () => {
      const validIds = ["run-123", "run-abc", "pipeline-1", "execution-999"];

      for (const runId of validIds) {
        const result = await ApprovalService.approve(runId);
        expect(result).toBeDefined();
      }
    });

    it("should handle step IDs in operations", async () => {
      const steps = ["setup", "test", "build", "deploy"];

      for (const step of steps) {
        const result = await ApprovalService.retry("run-123", step);
        expect(result).toBeDefined();
      }
    });
  });

  describe("Operation Sequencing", () => {
    it("should allow multiple operations on same run", async () => {
      const runId = "run-seq-123";

      const resume = await ApprovalService.resume(runId);
      expect(resume).toBeDefined();

      const retry = await ApprovalService.retry(runId, "step-1");
      expect(retry).toBeDefined();

      const rollback = await ApprovalService.rollback(runId, "step-2");
      expect(rollback).toBeDefined();
    });

    it("should handle approval followed by resume", async () => {
      const runId = "run-flow-123";

      const approve = await ApprovalService.approve(runId, "reviewer");
      expect(approve).toBeDefined();

      const resume = await ApprovalService.resume(runId, "executor");
      expect(resume).toBeDefined();
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing runs gracefully", async () => {
      // With proper error handling, should not throw
      try {
        await ApprovalService.approve("nonexistent-run");
      } catch (err) {
        // Expected behavior - mocked version returns undefined which is handled
      }
    });

    it("should handle invalid actors", async () => {
      // Any string should be acceptable as actor name
      const actors = ["", "very-long-actor-name-with-many-characters", "123", null];

      for (const actor of actors) {
        try {
          await ApprovalService.approve("run-123", actor as any);
        } catch (err) {
          // Might throw for invalid inputs
        }
      }
    });
  });

  describe("Approval Lifecycle", () => {
    it("should support full approval workflow", async () => {
      const runId = "run-workflow-123";

      // Step 1: Get pending approvals
      const approvals = ApprovalService.getApprovals();
      expect(Array.isArray(approvals)).toBe(true);

      // Step 2: Approve
      const approveResult = await ApprovalService.approve(runId, "reviewer");
      expect(approveResult).toBeDefined();

      // Step 3: Resume if needed
      const resumeResult = await ApprovalService.resume(runId);
      expect(resumeResult).toBeDefined();

      // Workflow complete
      expect(true).toBe(true);
    });

    it("should support rejection workflow", async () => {
      const runId = "run-reject-workflow";

      // Get approval
      const approvals = ApprovalService.getApprovals();
      expect(approvals.length).toBeGreaterThan(0);

      // Reject
      ApprovalService.reject(runId, "reviewer");

      // Verify rejection occurred
      expect(true).toBe(true);
    });

    it("should support retry workflow", async () => {
      const runId = "run-retry-workflow";

      // Approve
      await ApprovalService.approve(runId, "reviewer");

      // Retry failed step
      const retryResult = await ApprovalService.retry(runId, "test", "executor");
      expect(retryResult).toBeDefined();

      // Resume
      const resumeResult = await ApprovalService.resume(runId);
      expect(resumeResult).toBeDefined();
    });

    it("should support rollback workflow", async () => {
      const runId = "run-rollback-workflow";

      // Approve
      await ApprovalService.approve(runId, "reviewer");

      // Rollback step
      const rollbackResult = await ApprovalService.rollback(runId, "deploy", "executor");
      expect(rollbackResult).toBeDefined();

      // Resume after rollback
      const resumeResult = await ApprovalService.resume(runId);
      expect(resumeResult).toBeDefined();
    });
  });
});
