import { describe, it, expect, beforeEach } from "vitest";
import {
  AlertAcknowledgmentService,
  AutoAcknowledgmentRule,
  DEFAULT_AUTO_ACK_RULES,
} from "../src/services/alert-acknowledgment-service";

describe("AlertAcknowledgmentService", () => {
  let service: AlertAcknowledgmentService;

  beforeEach(() => {
    service = new AlertAcknowledgmentService(DEFAULT_AUTO_ACK_RULES);
  });

  describe("Rule Registration", () => {
    it("should register a new rule", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "test-ack-rule",
        name: "Test Ack Rule",
        description: "A test acknowledgment rule",
        alertRuleId: "test-alert",
        enabled: true,
        resolutionConditions: [{ type: "metric_below_threshold", metric: "error_rate", threshold: 1 }],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "test-ack-rule")).toBe(true);
    });

    it("should not register disabled rules", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "disabled-ack-rule",
        name: "Disabled Rule",
        description: "A disabled rule",
        alertRuleId: "test-alert",
        enabled: false,
        resolutionConditions: [],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "disabled-ack-rule")).toBe(false);
    });
  });

  describe("Alert Tracking", () => {
    it("should record a new alert", () => {
      service.recordAlert("test-alert-rule", "alert-123");
      const pending = service.getPendingAlerts();

      expect(pending).toContainEqual(expect.objectContaining({ alertId: "alert-123" }));
    });

    it("should track multiple alerts", () => {
      service.recordAlert("alert-rule-1", "alert-001");
      service.recordAlert("alert-rule-1", "alert-002");
      service.recordAlert("alert-rule-2", "alert-003");

      const pending = service.getPendingAlerts();
      expect(pending.length).toBeGreaterThanOrEqual(3);
    });

    it("should track alert trigger time", () => {
      const before = new Date();
      service.recordAlert("test-rule", "alert-123");
      const after = new Date();

      const pending = service.getPendingAlerts();
      const alert = pending.find((a) => a.alertId === "alert-123");

      expect(alert?.triggeredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(alert?.triggeredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("Manual Acknowledgment", () => {
    it("should manually acknowledge an alert", async () => {
      service.recordAlert("test-rule", "alert-123");

      const ack = await service.manuallyAcknowledge(
        "alert-123",
        "test-rule",
        "user@example.com",
        "Manually acknowledged"
      );

      expect(ack.alertId).toBe("alert-123");
      expect(ack.acknowledgedBy).toBe("user@example.com");
      expect(ack.resolutionMethod).toBe("manual");
    });

    it("should remove alert from pending after manual ack", async () => {
      service.recordAlert("test-rule", "alert-123");

      await service.manuallyAcknowledge("alert-123", "test-rule", "user", "Acknowledged");

      const pending = service.getPendingAlerts();
      expect(pending.find((a) => a.alertId === "alert-123")).toBeUndefined();
    });

    it("should store acknowledgment with reason", async () => {
      service.recordAlert("test-rule", "alert-123");

      const ack = await service.manuallyAcknowledge(
        "alert-123",
        "test-rule",
        "user",
        "Custom reason"
      );

      expect(ack.reason).toBe("Custom reason");
    });
  });

  describe("Resolution Conditions", () => {
    it("should support metric_below_threshold condition", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "metric-rule",
        name: "Metric Below Threshold",
        description: "Test metric condition",
        alertRuleId: "metric-alert",
        enabled: true,
        resolutionConditions: [
          { type: "metric_below_threshold", metric: "cpu_usage", threshold: 50 },
        ],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "metric-rule")).toBe(true);
    });

    it("should support error_rate_recovered condition", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "error-rate-rule",
        name: "Error Rate Recovered",
        description: "Test error rate condition",
        alertRuleId: "error-alert",
        enabled: true,
        resolutionConditions: [{ type: "error_rate_recovered" }],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "error-rate-rule")).toBe(true);
    });

    it("should support service_healthy condition", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "health-rule",
        name: "Service Health",
        description: "Test health condition",
        alertRuleId: "health-alert",
        enabled: true,
        resolutionConditions: [{ type: "service_healthy" }],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "health-rule")).toBe(true);
    });

    it("should support time_elapsed condition", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "time-rule",
        name: "Time Elapsed",
        description: "Test time condition",
        alertRuleId: "time-alert",
        enabled: true,
        resolutionConditions: [{ type: "time_elapsed", waitMinutes: 5 }],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "time-rule")).toBe(true);
    });

    it("should support multiple conditions", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "multi-condition-rule",
        name: "Multiple Conditions",
        description: "Test multiple conditions",
        alertRuleId: "multi-alert",
        enabled: true,
        resolutionConditions: [
          { type: "error_rate_recovered" },
          { type: "service_healthy" },
          { type: "time_elapsed", waitMinutes: 2 },
        ],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "multi-condition-rule");

      expect(rule_obj?.resolutionConditions.length).toBe(3);
    });
  });

  describe("Action Types", () => {
    it("should support acknowledge action", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "ack-action-rule",
        name: "Ack Action",
        description: "Test acknowledge action",
        alertRuleId: "action-alert",
        enabled: true,
        resolutionConditions: [],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "ack-action-rule");

      expect(rule_obj?.actions[0].type).toBe("acknowledge");
    });

    it("should support log action", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "log-action-rule",
        name: "Log Action",
        description: "Test log action",
        alertRuleId: "action-alert",
        enabled: true,
        resolutionConditions: [],
        actions: [{ type: "log", config: { message: "Alert resolved" } }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "log-action-rule");

      expect(rule_obj?.actions[0].type).toBe("log");
    });

    it("should support notify action", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "notify-action-rule",
        name: "Notify Action",
        description: "Test notify action",
        alertRuleId: "action-alert",
        enabled: true,
        resolutionConditions: [],
        actions: [{ type: "notify", config: { channel: "#alerts" } }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "notify-action-rule");

      expect(rule_obj?.actions[0].type).toBe("notify");
    });

    it("should support auto_remediate action", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "remediate-action-rule",
        name: "Remediate Action",
        description: "Test remediate action",
        alertRuleId: "action-alert",
        enabled: true,
        resolutionConditions: [],
        actions: [{ type: "auto_remediate", config: { action: "scale_up" } }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "remediate-action-rule");

      expect(rule_obj?.actions[0].type).toBe("auto_remediate");
    });
  });

  describe("Acknowledgment Retrieval", () => {
    it("should retrieve acknowledgment by ID", async () => {
      service.recordAlert("test-rule", "alert-123");
      const ack = await service.manuallyAcknowledge("alert-123", "test-rule", "user", "Acked");

      const retrieved = service.getAcknowledgment(ack.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.alertId).toBe("alert-123");
    });

    it("should get all acknowledgments for an alert", async () => {
      service.recordAlert("test-rule", "alert-123");
      await service.manuallyAcknowledge("alert-123", "test-rule", "user1", "First ack");

      const acks = service.getAcknowledgmentsForAlert("alert-123");
      expect(acks.length).toBeGreaterThan(0);
      expect(acks[0].alertId).toBe("alert-123");
    });
  });

  describe("Default Rules", () => {
    it("should include 5xx error recovery rule", () => {
      const rules = service.getAllRules();
      const rule = rules.find((r) => r.id === "auto-ack-5xx-recovered");

      expect(rule).toBeDefined();
      expect(rule?.alertRuleId).toBe("http-5xx-burst");
    });

    it("should include auth failure recovery rule", () => {
      const rules = service.getAllRules();
      const rule = rules.find((r) => r.id === "auto-ack-auth-recovery");

      expect(rule).toBeDefined();
      expect(rule?.alertRuleId).toBe("auth-failures");
    });

    it("should include service health rule", () => {
      const rules = service.getAllRules();
      const rule = rules.find((r) => r.id === "auto-ack-service-healthy");

      expect(rule).toBeDefined();
    });
  });

  describe("Max Wait Time", () => {
    it("should respect max wait time configuration", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "max-wait-rule",
        name: "Max Wait Rule",
        description: "Test max wait time",
        alertRuleId: "wait-alert",
        enabled: true,
        maxWaitTimeMinutes: 10,
        resolutionConditions: [],
        actions: [{ type: "acknowledge" }],
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "max-wait-rule");

      expect(rule_obj?.maxWaitTimeMinutes).toBe(10);
    });
  });
});
