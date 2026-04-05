import { describe, it, expect, beforeEach } from "vitest";
import {
  AutomationOrchestrator,
  AutomationConfig,
} from "../src/services/automation-orchestrator";
import { AutoApprovalRule } from "../src/services/auto-approval-engine";
import { AutoAcknowledgmentRule } from "../src/services/alert-acknowledgment-service";
import { HealingStrategy } from "../src/services/healing-engine";
import { RollbackStrategy } from "../src/services/rollback-automation";

describe("AutomationOrchestrator", () => {
  let orchestrator: AutomationOrchestrator;

  beforeEach(() => {
    const config: AutomationConfig = {
      enabled: true,
      mode: "balanced",
    };
    orchestrator = new AutomationOrchestrator(config);
  });

  describe("Initialization", () => {
    it("should initialize with default config", () => {
      const status = orchestrator.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.mode).toBe("balanced");
    });

    it("should initialize with custom config", () => {
      const config: AutomationConfig = {
        enabled: true,
        mode: "aggressive",
      };
      const custom = new AutomationOrchestrator(config);
      const status = custom.getStatus();

      expect(status.mode).toBe("aggressive");
    });

    it("should support disabled automation", () => {
      const config: AutomationConfig = {
        enabled: false,
        mode: "safe",
      };
      const disabled = new AutomationOrchestrator(config);
      const status = disabled.getStatus();

      expect(status.enabled).toBe(false);
    });
  });

  describe("Mode Management", () => {
    it("should support safe mode", () => {
      orchestrator.setMode("safe");
      const status = orchestrator.getStatus();
      expect(status.mode).toBe("safe");
    });

    it("should support balanced mode", () => {
      orchestrator.setMode("balanced");
      const status = orchestrator.getStatus();
      expect(status.mode).toBe("balanced");
    });

    it("should support aggressive mode", () => {
      orchestrator.setMode("aggressive");
      const status = orchestrator.getStatus();
      expect(status.mode).toBe("aggressive");
    });

    it("should switch between modes", () => {
      orchestrator.setMode("safe");
      let status = orchestrator.getStatus();
      expect(status.mode).toBe("safe");

      orchestrator.setMode("aggressive");
      status = orchestrator.getStatus();
      expect(status.mode).toBe("aggressive");

      orchestrator.setMode("balanced");
      status = orchestrator.getStatus();
      expect(status.mode).toBe("balanced");
    });
  });

  describe("Enable/Disable", () => {
    it("should enable automation", () => {
      orchestrator.setEnabled(true);
      const status = orchestrator.getStatus();
      expect(status.enabled).toBe(true);
    });

    it("should disable automation", () => {
      orchestrator.setEnabled(false);
      const status = orchestrator.getStatus();
      expect(status.enabled).toBe(false);
    });

    it("should toggle between enabled and disabled", () => {
      orchestrator.setEnabled(true);
      let status = orchestrator.getStatus();
      expect(status.enabled).toBe(true);

      orchestrator.setEnabled(false);
      status = orchestrator.getStatus();
      expect(status.enabled).toBe(false);

      orchestrator.setEnabled(true);
      status = orchestrator.getStatus();
      expect(status.enabled).toBe(true);
    });
  });

  describe("Service Status", () => {
    it("should report service status", () => {
      const status = orchestrator.getStatus();

      expect(status.services).toBeDefined();
      expect(status.services.autoApproval).toBeDefined();
      expect(status.services.alertAcknowledgment).toBeDefined();
      expect(status.services.testVerification).toBeDefined();
      expect(status.services.healing).toBeDefined();
      expect(status.services.rollback).toBeDefined();
    });

    it("should include rule/strategy counts", () => {
      const status = orchestrator.getStatus();

      expect(status.services.autoApproval.rulesCount).toBeGreaterThanOrEqual(0);
      expect(status.services.alertAcknowledgment.rulesCount).toBeGreaterThanOrEqual(0);
      expect(status.services.testVerification.rulesCount).toBeGreaterThanOrEqual(0);
      expect(status.services.healing.strategiesCount).toBeGreaterThanOrEqual(0);
      expect(status.services.rollback.strategiesCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Metrics", () => {
    it("should report metrics", () => {
      const status = orchestrator.getStatus();

      expect(status.metrics).toBeDefined();
      expect(status.metrics.autoApprovalsExecuted).toBeDefined();
      expect(status.metrics.alertsAutoAcknowledged).toBeDefined();
      expect(status.metrics.testVerificationsRun).toBeDefined();
      expect(status.metrics.healingStrategiesTriggered).toBeDefined();
      expect(status.metrics.rolbacksExecuted).toBeDefined();
    });

    it("should initialize metrics to zero", () => {
      const status = orchestrator.getStatus();

      expect(status.metrics.autoApprovalsExecuted).toBe(0);
      expect(status.metrics.alertsAutoAcknowledged).toBe(0);
      expect(status.metrics.testVerificationsRun).toBe(0);
      expect(status.metrics.healingStrategiesTriggered).toBe(0);
      expect(status.metrics.rolbacksExecuted).toBe(0);
    });
  });

  describe("Rule Registration", () => {
    it("should register auto-approval rules", () => {
      const rule: AutoApprovalRule = {
        id: "test-approval",
        name: "Test",
        description: "Test",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      orchestrator.registerAutoApprovalRule(rule);
      const engine = orchestrator.getAutoApprovalEngine();
      const rules = engine.getAllRules();

      expect(rules.some((r) => r.id === "test-approval")).toBe(true);
    });

    it("should register alert acknowledgment rules", () => {
      const rule: AutoAcknowledgmentRule = {
        id: "test-ack",
        name: "Test",
        description: "Test",
        alertRuleId: "test-alert",
        enabled: true,
        resolutionConditions: [],
        actions: [{ type: "acknowledge" }],
      };

      orchestrator.registerAlertAcknowledgmentRule(rule);
      const service = orchestrator.getAlertAcknowledgmentService();
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "test-ack")).toBe(true);
    });

    it("should register healing strategies", () => {
      const strategy: HealingStrategy = {
        id: "test-healing",
        name: "Test",
        description: "Test",
        priority: 70,
        enabled: true,
        condition: {
          type: "error_rate",
          metric: "error_rate",
          operator: "greater_than",
          threshold: 10,
          duration: 30,
        },
        actions: [{ type: "scale_up", priority: 90 }],
        rollbackOn: [],
        maxAttempts: 2,
        timeout: 120,
      };

      orchestrator.registerHealingStrategy(strategy);
      const engine = orchestrator.getHealingEngine();
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "test-healing")).toBe(true);
    });

    it("should register rollback strategies", () => {
      const strategy: RollbackStrategy = {
        id: "test-rollback",
        name: "Test",
        description: "Test",
        enabled: true,
        priority: 80,
        triggers: [],
        rollbackActions: [],
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      orchestrator.registerRollbackStrategy(strategy);
      const service = orchestrator.getRollbackService();
      const strategies = service.getAllStrategies();

      expect(strategies.some((s) => s.id === "test-rollback")).toBe(true);
    });
  });

  describe("Service Access", () => {
    it("should provide access to auto-approval engine", () => {
      const engine = orchestrator.getAutoApprovalEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.getAllRules).toBe("function");
    });

    it("should provide access to alert acknowledgment service", () => {
      const service = orchestrator.getAlertAcknowledgmentService();
      expect(service).toBeDefined();
      expect(typeof service.getAllRules).toBe("function");
    });

    it("should provide access to test verification service", () => {
      const service = orchestrator.getTestVerificationService();
      expect(service).toBeDefined();
      expect(typeof service.getAllRules).toBe("function");
    });

    it("should provide access to healing engine", () => {
      const engine = orchestrator.getHealingEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.getAllStrategies).toBe("function");
    });

    it("should provide access to rollback service", () => {
      const service = orchestrator.getRollbackService();
      expect(service).toBeDefined();
      expect(typeof service.getAllStrategies).toBe("function");
    });
  });

  describe("Configuration", () => {
    it("should support different automation configs", () => {
      const safeConfig: AutomationConfig = { enabled: true, mode: "safe" };
      const balancedConfig: AutomationConfig = { enabled: true, mode: "balanced" };
      const aggressiveConfig: AutomationConfig = { enabled: true, mode: "aggressive" };

      const safe = new AutomationOrchestrator(safeConfig);
      const balanced = new AutomationOrchestrator(balancedConfig);
      const aggressive = new AutomationOrchestrator(aggressiveConfig);

      expect(safe.getStatus().mode).toBe("safe");
      expect(balanced.getStatus().mode).toBe("balanced");
      expect(aggressive.getStatus().mode).toBe("aggressive");
    });

    it("should support metric collection config", () => {
      const config: AutomationConfig = {
        enabled: true,
        mode: "balanced",
        metrics: {
          enableMetricsCollection: true,
          aggregationWindowSeconds: 60,
        },
      };

      const orch = new AutomationOrchestrator(config);
      expect(orch.getStatus().enabled).toBe(true);
    });
  });

  describe("Status Reporting", () => {
    it("should include all required status fields", () => {
      const status = orchestrator.getStatus();

      expect(status.enabled).toBeDefined();
      expect(status.mode).toBeDefined();
      expect(status.services).toBeDefined();
      expect(status.metrics).toBeDefined();
    });

    it("should update status after mode change", () => {
      const before = orchestrator.getStatus();
      expect(before.mode).toBe("balanced");

      orchestrator.setMode("aggressive");
      const after = orchestrator.getStatus();
      expect(after.mode).toBe("aggressive");
    });

    it("should update status after enable/disable", () => {
      const before = orchestrator.getStatus();
      expect(before.enabled).toBe(true);

      orchestrator.setEnabled(false);
      const after = orchestrator.getStatus();
      expect(after.enabled).toBe(false);
    });
  });

  describe("Lifecycle", () => {
    it("should support start operation", () => {
      orchestrator.setEnabled(true);
      // Just verify it doesn't throw
      expect(orchestrator.getStatus().enabled).toBe(true);
    });

    it("should support stop operation", () => {
      orchestrator.setEnabled(false);
      // Just verify it doesn't throw
      expect(orchestrator.getStatus().enabled).toBe(false);
    });
  });
});
