import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  onGateApproved,
  onGateRejected,
  onAutoApprovalChainCompleted,
  registerGateApprovedHandler,
  registerGateRejectedHandler,
  registerChainCompletedHandler,
  dispatchGateApprovedEvent,
  dispatchGateRejectedEvent,
  dispatchChainCompletedEvent,
  getHandlerRegistry,
  type AutoApprovalEventContext,
  type ChainCompletionContext,
} from "../src/services/auto-approval-chain-handlers";
import * as runStore from "@memory/run-store";
import { getAlertStore } from "../src/services/alert-store";
import * as auditBuilder from "../src/lib/audit-builder";

// Create builder object that will be returned by AuditEventBuilder constructor
const createMockBuilder = () => ({
  withAlertId: vi.fn().mockReturnThis(),
  withRunId: vi.fn().mockReturnThis(),
  withGateId: vi.fn().mockReturnThis(),
  withResult: vi.fn().mockReturnThis(),
  withCorrelationId: vi.fn().mockReturnThis(),
  withDetails: vi.fn().mockReturnThis(),
  emit: vi.fn().mockResolvedValue(undefined),
});

let mockBuilder = createMockBuilder();

// Mock dependencies
vi.mock("@memory/run-store");
vi.mock("../src/services/alert-store");

vi.mock("../src/lib/audit-builder", () => {
  return {
    AuditEventBuilder: vi.fn(() => mockBuilder),
    AuditActions: {
      GATE_APPROVED: "GATE_APPROVED",
      GATE_REJECTED: "GATE_REJECTED",
      APPROVAL_CHAIN_COMPLETED: "APPROVAL_CHAIN_COMPLETED",
    },
  };
});

describe("Auto-Approval Chain Event Handlers", () => {
  const mockContext: AutoApprovalEventContext = {
    runId: "run-123",
    gateId: "security-gate",
    tenant: {
      orgId: "org-1",
      workspaceId: "ws-1",
      projectId: "proj-1",
    },
    actor: {
      id: "actor-1",
      type: "system",
      name: "auto-approval-service",
    },
    correlationId: "corr-123",
    metadata: {
      reason: "Test approval",
    },
  };

  const mockChainContext: ChainCompletionContext = {
    ...mockContext,
    totalGates: 5,
    approvedGates: 4,
    rejectedGates: 1,
    result: "partial_failure",
  };

  let mockRunBundle: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockBuilder for fresh mock state
    mockBuilder = createMockBuilder();
    // Reset handler registry
    getHandlerRegistry().onGateApproved.clear();
    getHandlerRegistry().onGateRejected.clear();
    getHandlerRegistry().onChainCompleted.clear();

    // Create fresh mockRunBundle for each test to prevent mutation pollution
    mockRunBundle = {
      state: {
        runId: "run-123",
        orgId: "org-1",
        approvedGates: [],
        rejectedGates: [],
        correlationId: "corr-123",
        updatedAt: new Date().toISOString(),
      },
    };

    // Setup default mocks
    vi.mocked(runStore.loadRunBundle).mockReturnValue(mockRunBundle as any);
    vi.mocked(runStore.updateRunState).mockResolvedValue(undefined as any);
    vi.mocked(getAlertStore).mockReturnValue({ recordAlert: vi.fn().mockResolvedValue(undefined) } as any);
  });

  describe("onGateApproved handler", () => {
    it("should log audit event when gate is approved", async () => {
      await onGateApproved(mockContext);

      expect(runStore.loadRunBundle).toHaveBeenCalledWith("run-123");
      expect(mockBuilder.emit).toHaveBeenCalled();
    });

    it("should add gate to approvedGates in run state", async () => {
      await onGateApproved(mockContext);

      expect(runStore.updateRunState).toHaveBeenCalledWith("run-123", expect.any(Object));
      const [, updatedState] = vi.mocked(runStore.updateRunState).mock.calls[0];
      expect(updatedState.approvedGates).toContain("security-gate");
    });

    it("should not add duplicate gates to approvedGates", async () => {
      const bundleWithApprovedGate = {
        ...mockRunBundle,
        state: { ...mockRunBundle.state, approvedGates: ["security-gate"] },
      };
      vi.mocked(runStore.loadRunBundle).mockReturnValue(bundleWithApprovedGate as any);

      await onGateApproved(mockContext);

      // Should not call updateRunState when gate is already approved
      expect(runStore.updateRunState).not.toHaveBeenCalled();
    });

    it("should handle missing run bundle gracefully", async () => {
      vi.mocked(runStore.loadRunBundle).mockReturnValue(null);

      await onGateApproved(mockContext);

      expect(runStore.updateRunState).not.toHaveBeenCalled();
    });
  });

  describe("onGateRejected handler", () => {
    it("should log audit event when gate is rejected", async () => {
      await onGateRejected(mockContext);

      expect(runStore.loadRunBundle).toHaveBeenCalledWith("run-123");
      expect(mockBuilder.emit).toHaveBeenCalled();
    });

    it("should add gate to rejectedGates in run state", async () => {
      await onGateRejected(mockContext);

      expect(runStore.updateRunState).toHaveBeenCalledWith("run-123", expect.any(Object));
      const [, updatedState] = vi.mocked(runStore.updateRunState).mock.calls[0];
      expect(updatedState.rejectedGates).toContain("security-gate");
    });

    it("should create alert for rejected gate", async () => {
      const mockAlertStore = {
        recordAlert: vi.fn(),
      };
      vi.mocked(getAlertStore).mockReturnValue(mockAlertStore as any);

      await onGateRejected(mockContext);

      expect(mockAlertStore.recordAlert).toHaveBeenCalledWith(expect.any(Object));
      const alert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(alert.type).toBe("deployment_failure");
      expect(alert.metadata.runId).toBe("run-123");
      expect(alert.metadata.gateId).toBe("security-gate");
    });

    it("should not create duplicate rejection alerts", async () => {
      const bundleWithRejectedGate = {
        ...mockRunBundle,
        state: { ...mockRunBundle.state, rejectedGates: ["security-gate"] },
      };
      vi.mocked(runStore.loadRunBundle).mockReturnValue(bundleWithRejectedGate as any);
      const mockAlertStore = {
        recordAlert: vi.fn(),
      };
      vi.mocked(getAlertStore).mockReturnValue(mockAlertStore as any);

      await onGateRejected(mockContext);

      // Should not call updateRunState or create alert when gate is already rejected
      expect(runStore.updateRunState).not.toHaveBeenCalled();
      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });
  });

  describe("onAutoApprovalChainCompleted handler", () => {
    it("should log completion audit event", async () => {
      await onAutoApprovalChainCompleted(mockChainContext);

      expect(mockBuilder.emit).toHaveBeenCalled();
    });

    it("should update run state with completion status", async () => {
      await onAutoApprovalChainCompleted(mockChainContext);

      expect(runStore.updateRunState).toHaveBeenCalledWith("run-123", expect.any(Object));
      const [, updatedState] = vi.mocked(runStore.updateRunState).mock.calls[0];
      expect(updatedState.chainStatus).toBe("partial_failure");
      expect(updatedState.chainCompletedAt).toBeDefined();
    });

    it("should create alert for partial failure", async () => {
      const mockAlertStore = {
        recordAlert: vi.fn(),
      };
      vi.mocked(getAlertStore).mockReturnValue(mockAlertStore as any);

      await onAutoApprovalChainCompleted(mockChainContext);

      expect(mockAlertStore.recordAlert).toHaveBeenCalled();
      const alert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(alert.severity).toBe("high");
    });

    it("should create critical alert for full failure", async () => {
      const fullFailureContext: ChainCompletionContext = {
        ...mockChainContext,
        approvedGates: 0,
        rejectedGates: 5,
        result: "full_failure",
      };

      const mockAlertStore = {
        recordAlert: vi.fn(),
      };
      vi.mocked(getAlertStore).mockReturnValue(mockAlertStore as any);

      await onAutoApprovalChainCompleted(fullFailureContext);

      const alert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(alert.severity).toBe("critical");
    });

    it("should not create alert for successful completion", async () => {
      const successContext: ChainCompletionContext = {
        ...mockChainContext,
        approvedGates: 5,
        rejectedGates: 0,
        result: "success",
      };

      const mockAlertStore = {
        recordAlert: vi.fn(),
      };
      vi.mocked(getAlertStore).mockReturnValue(mockAlertStore as any);

      await onAutoApprovalChainCompleted(successContext);

      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });
  });

  describe("Event handler registration and dispatch", () => {
    it("should register and invoke custom handlers on gate approval", async () => {
      const customHandler = vi.fn();
      registerGateApprovedHandler(customHandler);

      await dispatchGateApprovedEvent(mockContext);

      expect(customHandler).toHaveBeenCalledWith(mockContext);
    });

    it("should register and invoke custom handlers on gate rejection", async () => {
      const customHandler = vi.fn();
      registerGateRejectedHandler(customHandler);
      vi.mocked(getAlertStore).mockReturnValue({ recordAlert: vi.fn() } as any);

      await dispatchGateRejectedEvent(mockContext);

      expect(customHandler).toHaveBeenCalledWith(mockContext);
    });

    it("should register and invoke custom handlers on chain completion", async () => {
      const customHandler = vi.fn();
      registerChainCompletedHandler(customHandler);
      vi.mocked(getAlertStore).mockReturnValue({ recordAlert: vi.fn() } as any);

      await dispatchChainCompletedEvent(mockChainContext);

      expect(customHandler).toHaveBeenCalledWith(mockChainContext);
    });

    it("should continue dispatching despite custom handler errors", async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error("Handler error"));
      const workingHandler = vi.fn();
      registerGateApprovedHandler(failingHandler);
      registerGateApprovedHandler(workingHandler);

      await dispatchGateApprovedEvent(mockContext);

      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled(); // Still called despite first handler error
    });

    it("should support multiple custom handlers for same event", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      registerGateApprovedHandler(handler1);
      registerGateApprovedHandler(handler2);
      registerGateApprovedHandler(handler3);

      await dispatchGateApprovedEvent(mockContext);

      expect(handler1).toHaveBeenCalledWith(mockContext);
      expect(handler2).toHaveBeenCalledWith(mockContext);
      expect(handler3).toHaveBeenCalledWith(mockContext);
    });
  });

  describe("Handler registry management", () => {
    it("should return handler registry with all handler sets", () => {
      const registry = getHandlerRegistry();
      expect(registry).toHaveProperty("onGateApproved");
      expect(registry).toHaveProperty("onGateRejected");
      expect(registry).toHaveProperty("onChainCompleted");
    });

    it("should allow clearing handlers between tests", () => {
      registerGateApprovedHandler(vi.fn());
      expect(getHandlerRegistry().onGateApproved.size).toBe(1);

      getHandlerRegistry().onGateApproved.clear();
      expect(getHandlerRegistry().onGateApproved.size).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should handle missing run bundle in approval", async () => {
      vi.mocked(runStore.loadRunBundle).mockReturnValue(null);

      await onGateApproved(mockContext);

      expect(runStore.updateRunState).not.toHaveBeenCalled();
    });

    it("should handle missing run bundle in rejection", async () => {
      vi.mocked(runStore.loadRunBundle).mockReturnValue(null);

      await onGateRejected(mockContext);

      expect(runStore.updateRunState).not.toHaveBeenCalled();
    });

    it("should handle missing run bundle in completion", async () => {
      vi.mocked(runStore.loadRunBundle).mockReturnValue(null);

      await onAutoApprovalChainCompleted(mockChainContext);

      expect(runStore.updateRunState).not.toHaveBeenCalled();
    });

    it("should handle audit event emission errors gracefully", async () => {
      mockBuilder.emit.mockRejectedValue(new Error("Audit error"));

      // Should not throw
      await expect(onGateApproved(mockContext)).resolves.not.toThrow();
    });
  });

  describe("Audit logging", () => {
    it("should include metadata in approval audit event", async () => {
      const contextWithMetadata: AutoApprovalEventContext = {
        ...mockContext,
        metadata: {
          reason: "High coverage met",
          autoApprovalScore: 95,
        },
      };

      await onGateApproved(contextWithMetadata);

      expect(mockBuilder.withDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "High coverage met",
          autoApprovalScore: 95,
        })
      );
    });

    it("should include rejection reason in audit event", async () => {
      const contextWithReason: AutoApprovalEventContext = {
        ...mockContext,
        metadata: {
          reason: "Security vulnerabilities detected",
        },
      };

      await onGateRejected(contextWithReason);

      expect(mockBuilder.withDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectionReason: "Security vulnerabilities detected",
        })
      );
    });
  });
});
