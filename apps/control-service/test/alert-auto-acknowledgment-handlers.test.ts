import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  onAlertAutoAcknowledged,
  onAlertEscalated,
  onAcknowledgmentCompleted,
  registerAlertAutoAcknowledgedHandler,
  registerAlertEscalatedHandler,
  registerAcknowledgmentCompletedHandler,
  dispatchAlertAutoAcknowledgedEvent,
  dispatchAlertEscalatedEvent,
  dispatchAcknowledgmentCompletedEvent,
  getHandlerRegistry,
  type AlertAutoAcknowledgmentContext,
  type AlertEscalationContext,
  type AcknowledgmentCompletionContext,
} from "../src/services/alert-auto-acknowledgment-handlers";
import * as alertStore from "../../../packages/alert-management/src/alert-store";
import * as acknowledmentService from "../src/services/alert-acknowledgment-service";
import * as auditBuilder from "../src/lib/audit-builder";

// Mock dependencies
vi.mock("../../../packages/alert-management/src/alert-store");
vi.mock("../src/services/alert-acknowledgment-service");
vi.mock("../src/lib/audit-builder");

describe("Alert Auto-Acknowledgment Event Handlers", () => {
  const mockContext: AlertAutoAcknowledgmentContext = {
    alertId: "alert-123",
    tenant: {
      orgId: "org-1",
      workspaceId: "ws-1",
      projectId: "proj-1",
    },
    actor: {
      id: "actor-1",
      type: "system",
      name: "auto-acknowledgment-service",
    },
    correlationId: "corr-123",
    reason: "Test acknowledgment",
    ruleId: "rule-1",
    metadata: {
      autoAckScore: 95,
    },
  };

  const mockEscalationContext: AlertEscalationContext = {
    ...mockContext,
    escalationLevel: 2,
    failedConditions: ["threshold_exceeded", "timeout"],
  };

  const mockCompletionContext: AcknowledgmentCompletionContext = {
    alertId: "alert-123",
    tenant: mockContext.tenant,
    actor: mockContext.actor,
    correlationId: mockContext.correlationId,
    status: "acknowledged",
    acknowledgedAt: new Date(),
    metadata: mockContext.metadata,
  };

  const mockAlert = {
    id: "alert-123",
    type: "alert",
    severity: "high",
    title: "Test Alert",
    description: "Test alert description",
    isResolved: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset handler registry
    getHandlerRegistry().onAlertAutoAcknowledged.clear();
    getHandlerRegistry().onAlertEscalated.clear();
    getHandlerRegistry().onAcknowledgmentCompleted.clear();

    // Setup default mocks
    vi.mocked(alertStore.getAlertStore).mockReturnValue({
      getAlert: vi.fn().mockResolvedValue(mockAlert),
      recordAlert: vi.fn().mockResolvedValue(undefined),
    } as any);

    vi.mocked(acknowledmentService.getAlertAcknowledgmentService).mockReturnValue({
      recordAcknowledgment: vi.fn(),
    } as any);
  });

  describe("onAlertAutoAcknowledged handler", () => {
    it("should log audit event when alert is auto-acknowledged", async () => {
      const mockEmit = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertAutoAcknowledged(mockContext);

      expect(auditBuilder.AuditEventBuilder.prototype.emit).toHaveBeenCalled();
    });

    it("should record acknowledgment in alert acknowledgment service", async () => {
      const mockService = {
        recordAcknowledgment: vi.fn(),
      };
      vi.mocked(acknowledmentService.getAlertAcknowledgmentService).mockReturnValue(
        mockService as any
      );
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertAutoAcknowledged(mockContext);

      expect(mockService.recordAcknowledgment).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: "alert-123",
          acknowledgedBy: "auto-acknowledgment-service",
          reason: "Test acknowledgment",
          resolutionMethod: "auto",
        })
      );
    });

    it("should handle missing alert gracefully", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAlertAutoAcknowledged(mockContext);

      const mockService = vi.mocked(acknowledmentService.getAlertAcknowledgmentService)();
      expect(mockService.recordAcknowledgment).not.toHaveBeenCalled();
    });

    it("should include metadata in recorded acknowledgment", async () => {
      const mockService = {
        recordAcknowledgment: vi.fn(),
      };
      vi.mocked(acknowledmentService.getAlertAcknowledgmentService).mockReturnValue(
        mockService as any
      );
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertAutoAcknowledged(mockContext);

      expect(mockService.recordAcknowledgment).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: mockContext.metadata,
        })
      );
    });
  });

  describe("onAlertEscalated handler", () => {
    it("should log audit event when alert escalates", async () => {
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertEscalated(mockEscalationContext);

      expect(auditBuilder.AuditEventBuilder.prototype.emit).toHaveBeenCalled();
    });

    it("should create escalation alert in alert store", async () => {
      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertEscalated(mockEscalationContext);

      expect(mockAlertStore.recordAlert).toHaveBeenCalledWith(expect.any(Object));
      const recordedAlert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(recordedAlert.type).toBe("alert_escalation");
      expect(recordedAlert.severity).toBe("critical");
      expect(recordedAlert.alertId).toBe("alert-123");
    });

    it("should set severity to high for escalation level 1", async () => {
      const context: AlertEscalationContext = {
        ...mockEscalationContext,
        escalationLevel: 1,
      };

      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertEscalated(context);

      const recordedAlert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(recordedAlert.severity).toBe("high");
    });

    it("should handle missing alert gracefully", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAlertEscalated(mockEscalationContext);

      const mockAlertStore = vi.mocked(alertStore.getAlertStore)();
      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });

    it("should include failed conditions in escalation alert metadata", async () => {
      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertEscalated(mockEscalationContext);

      const recordedAlert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(recordedAlert.metadata.failedConditions).toEqual([
        "threshold_exceeded",
        "timeout",
      ]);
    });
  });

  describe("onAcknowledgmentCompleted handler", () => {
    it("should log completion audit event", async () => {
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAcknowledgmentCompleted(mockCompletionContext);

      expect(auditBuilder.AuditEventBuilder.prototype.emit).toHaveBeenCalled();
    });

    it("should create summary alert for escalated status", async () => {
      const context: AcknowledgmentCompletionContext = {
        ...mockCompletionContext,
        status: "escalated",
      };

      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAcknowledgmentCompleted(context);

      expect(mockAlertStore.recordAlert).toHaveBeenCalledWith(expect.any(Object));
      const recordedAlert = vi.mocked(mockAlertStore.recordAlert).mock.calls[0][0];
      expect(recordedAlert.type).toBe("alert_completion_failure");
      expect(recordedAlert.severity).toBe("high");
    });

    it("should not create alert for successful acknowledgment", async () => {
      const context: AcknowledgmentCompletionContext = {
        ...mockCompletionContext,
        status: "acknowledged",
      };

      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAcknowledgmentCompleted(context);

      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });

    it("should not create alert for unresolved status", async () => {
      const context: AcknowledgmentCompletionContext = {
        ...mockCompletionContext,
        status: "unresolved",
      };

      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAcknowledgmentCompleted(context);

      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });

    it("should handle missing alert gracefully", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAcknowledgmentCompleted(mockCompletionContext);

      const mockAlertStore = vi.mocked(alertStore.getAlertStore)();
      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });
  });

  describe("Event handler registration and dispatch", () => {
    it("should register and invoke custom handler on auto-acknowledgment", async () => {
      const customHandler = vi.fn();
      registerAlertAutoAcknowledgedHandler(customHandler);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await dispatchAlertAutoAcknowledgedEvent(mockContext);

      expect(customHandler).toHaveBeenCalledWith(mockContext);
    });

    it("should register and invoke custom handler on escalation", async () => {
      const customHandler = vi.fn();
      registerAlertEscalatedHandler(customHandler);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn(),
      } as any);

      await dispatchAlertEscalatedEvent(mockEscalationContext);

      expect(customHandler).toHaveBeenCalledWith(mockEscalationContext);
    });

    it("should register and invoke custom handler on completion", async () => {
      const customHandler = vi.fn();
      registerAcknowledgmentCompletedHandler(customHandler);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await dispatchAcknowledgmentCompletedEvent(mockCompletionContext);

      expect(customHandler).toHaveBeenCalledWith(mockCompletionContext);
    });

    it("should continue dispatching despite custom handler errors", async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error("Handler error"));
      const workingHandler = vi.fn();
      registerAlertAutoAcknowledgedHandler(failingHandler);
      registerAlertAutoAcknowledgedHandler(workingHandler);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await dispatchAlertAutoAcknowledgedEvent(mockContext);

      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled(); // Still called despite first handler error
    });

    it("should support multiple custom handlers for same event", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      registerAlertAutoAcknowledgedHandler(handler1);
      registerAlertAutoAcknowledgedHandler(handler2);
      registerAlertAutoAcknowledgedHandler(handler3);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await dispatchAlertAutoAcknowledgedEvent(mockContext);

      expect(handler1).toHaveBeenCalledWith(mockContext);
      expect(handler2).toHaveBeenCalledWith(mockContext);
      expect(handler3).toHaveBeenCalledWith(mockContext);
    });
  });

  describe("Handler registry management", () => {
    it("should return handler registry with all handler sets", () => {
      const registry = getHandlerRegistry();
      expect(registry).toHaveProperty("onAlertAutoAcknowledged");
      expect(registry).toHaveProperty("onAlertEscalated");
      expect(registry).toHaveProperty("onAcknowledgmentCompleted");
    });

    it("should allow clearing handlers between tests", () => {
      registerAlertAutoAcknowledgedHandler(vi.fn());
      expect(getHandlerRegistry().onAlertAutoAcknowledged.size).toBe(1);

      getHandlerRegistry().onAlertAutoAcknowledged.clear();
      expect(getHandlerRegistry().onAlertAutoAcknowledged.size).toBe(0);
    });

    it("should track multiple handlers in registry", () => {
      registerAlertAutoAcknowledgedHandler(vi.fn());
      registerAlertAutoAcknowledgedHandler(vi.fn());
      registerAlertEscalatedHandler(vi.fn());

      expect(getHandlerRegistry().onAlertAutoAcknowledged.size).toBe(2);
      expect(getHandlerRegistry().onAlertEscalated.size).toBe(1);
      expect(getHandlerRegistry().onAcknowledgmentCompleted.size).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should handle missing alert in auto-acknowledgment", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAlertAutoAcknowledged(mockContext);

      const mockService = vi.mocked(acknowledmentService.getAlertAcknowledgmentService)();
      expect(mockService.recordAcknowledgment).not.toHaveBeenCalled();
    });

    it("should handle missing alert in escalation", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAlertEscalated(mockEscalationContext);

      const mockAlertStore = vi.mocked(alertStore.getAlertStore)();
      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });

    it("should handle missing alert in completion", async () => {
      vi.mocked(alertStore.getAlertStore).mockReturnValue({
        getAlert: vi.fn().mockResolvedValue(null),
        recordAlert: vi.fn(),
      } as any);

      await onAcknowledgmentCompleted(mockCompletionContext);

      const mockAlertStore = vi.mocked(alertStore.getAlertStore)();
      expect(mockAlertStore.recordAlert).not.toHaveBeenCalled();
    });

    it("should handle audit event emission errors gracefully", async () => {
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockRejectedValue(
        new Error("Audit error")
      );

      // Should not throw
      await expect(onAlertAutoAcknowledged(mockContext)).resolves.not.toThrow();
    });

    it("should handle alert store errors in escalation", async () => {
      const mockAlertStore = {
        getAlert: vi.fn().mockResolvedValue(mockAlert),
        recordAlert: vi.fn().mockRejectedValue(new Error("Store error")),
      };
      vi.mocked(alertStore.getAlertStore).mockReturnValue(mockAlertStore as any);
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      // Should not throw
      await expect(onAlertEscalated(mockEscalationContext)).resolves.not.toThrow();
    });
  });

  describe("Audit logging", () => {
    it("should include metadata in auto-acknowledgment audit event", async () => {
      const contextWithMetadata: AlertAutoAcknowledgmentContext = {
        ...mockContext,
        metadata: {
          autoAckScore: 95,
          confidence: 0.98,
        },
      };
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertAutoAcknowledged(contextWithMetadata);

      expect(auditBuilder.AuditEventBuilder.prototype.withDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          autoAckScore: 95,
          confidence: 0.98,
        })
      );
    });

    it("should include escalation level in escalation audit event", async () => {
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAlertEscalated(mockEscalationContext);

      expect(auditBuilder.AuditEventBuilder.prototype.withDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 2,
        })
      );
    });

    it("should include completion status in completion audit event", async () => {
      vi.spyOn(auditBuilder.AuditEventBuilder.prototype, "emit").mockResolvedValue(
        undefined
      );

      await onAcknowledgmentCompleted(mockCompletionContext);

      expect(auditBuilder.AuditEventBuilder.prototype.withDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "acknowledged",
        })
      );
    });
  });
});
