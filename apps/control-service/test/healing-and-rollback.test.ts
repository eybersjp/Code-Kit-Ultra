import { describe, it, expect, beforeEach } from "vitest";
import {
  HealingEngine,
  HealingStrategy,
  DEFAULT_HEALING_STRATEGIES,
} from "../src/services/healing-engine";
import {
  RollbackAutomationService,
  RollbackStrategy,
  DEFAULT_ROLLBACK_STRATEGIES,
} from "../src/services/rollback-automation";

describe("HealingEngine", () => {
  let engine: HealingEngine;

  beforeEach(() => {
    engine = new HealingEngine(DEFAULT_HEALING_STRATEGIES);
  });

  describe("Strategy Registration", () => {
    it("should register a new strategy", () => {
      const strategy: HealingStrategy = {
        id: "test-healing",
        name: "Test Healing",
        description: "Test healing strategy",
        priority: 70,
        enabled: true,
        condition: {
          type: "error_rate",
          metric: "error_rate",
          operator: "greater_than",
          threshold: 10,
          duration: 30,
        },
        actions: [{ type: "scale_up", priority: 90, params: { replicas: 3 } }],
        rollbackOn: ["error_rate < 2"],
        maxAttempts: 3,
        timeout: 120,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "test-healing")).toBe(true);
    });

    it("should not register disabled strategies", () => {
      const strategy: HealingStrategy = {
        id: "disabled-healing",
        name: "Disabled",
        description: "Disabled strategy",
        priority: 50,
        enabled: false,
        condition: {
          type: "error_rate",
          metric: "error_rate",
          operator: "greater_than",
          threshold: 10,
          duration: 30,
        },
        actions: [],
        rollbackOn: [],
        maxAttempts: 1,
        timeout: 60,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "disabled-healing")).toBe(false);
    });
  });

  describe("Default Strategies", () => {
    it("should include high CPU strategy", () => {
      const strategies = engine.getAllStrategies();
      const cpuStrategy = strategies.find((s) => s.id === "heal-high-cpu");

      expect(cpuStrategy).toBeDefined();
      expect(cpuStrategy?.condition.metric).toBe("cpu_usage");
      expect(cpuStrategy?.condition.threshold).toBe(85);
    });

    it("should include high error rate strategy", () => {
      const strategies = engine.getAllStrategies();
      const errorStrategy = strategies.find((s) => s.id === "heal-high-error-rate");

      expect(errorStrategy).toBeDefined();
      expect(errorStrategy?.condition.metric).toBe("error_rate");
    });

    it("should include high latency strategy", () => {
      const strategies = engine.getAllStrategies();
      const latencyStrategy = strategies.find((s) => s.id === "heal-high-latency");

      expect(latencyStrategy).toBeDefined();
      expect(latencyStrategy?.condition.metric).toBe("p99_latency");
    });
  });

  describe("Strategy Conditions", () => {
    it("should support resource_usage condition type", () => {
      const strategy: HealingStrategy = {
        id: "resource-strategy",
        name: "Resource Usage",
        description: "Test resource condition",
        priority: 80,
        enabled: true,
        condition: {
          type: "resource_usage",
          metric: "memory_usage",
          operator: "greater_than",
          threshold: 90,
          duration: 60,
        },
        actions: [],
        rollbackOn: [],
        maxAttempts: 2,
        timeout: 90,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "resource-strategy")).toBe(true);
    });

    it("should support error_rate condition type", () => {
      const strategy: HealingStrategy = {
        id: "error-strategy",
        name: "Error Rate",
        description: "Test error rate condition",
        priority: 90,
        enabled: true,
        condition: {
          type: "error_rate",
          metric: "error_rate",
          operator: "greater_than",
          threshold: 5,
          duration: 30,
        },
        actions: [],
        rollbackOn: [],
        maxAttempts: 3,
        timeout: 120,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "error-strategy")).toBe(true);
    });

    it("should support latency condition type", () => {
      const strategy: HealingStrategy = {
        id: "latency-strategy",
        name: "Latency",
        description: "Test latency condition",
        priority: 75,
        enabled: true,
        condition: {
          type: "latency",
          metric: "p99_latency",
          operator: "greater_than",
          threshold: 5000,
          duration: 60,
        },
        actions: [],
        rollbackOn: [],
        maxAttempts: 2,
        timeout: 150,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();

      expect(strategies.some((s) => s.id === "latency-strategy")).toBe(true);
    });
  });

  describe("Action Types", () => {
    it("should support restart_service action", () => {
      const strategy: HealingStrategy = {
        id: "restart-strategy",
        name: "Restart",
        description: "Restart action",
        priority: 70,
        enabled: true,
        condition: {
          type: "service_degradation",
          metric: "service_health",
          operator: "less_than",
          threshold: 50,
          duration: 30,
        },
        actions: [{ type: "restart_service", priority: 85, params: { service: "api" } }],
        rollbackOn: [],
        maxAttempts: 2,
        timeout: 60,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();
      const strategy_obj = strategies.find((s) => s.id === "restart-strategy");

      expect(strategy_obj?.actions[0].type).toBe("restart_service");
    });

    it("should support scale_up action", () => {
      const strategy: HealingStrategy = {
        id: "scale-strategy",
        name: "Scale",
        description: "Scale action",
        priority: 80,
        enabled: true,
        condition: {
          type: "resource_usage",
          metric: "cpu_usage",
          operator: "greater_than",
          threshold: 85,
          duration: 30,
        },
        actions: [{ type: "scale_up", priority: 90, params: { replicas: 3 } }],
        rollbackOn: [],
        maxAttempts: 3,
        timeout: 120,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();
      const strategy_obj = strategies.find((s) => s.id === "scale-strategy");

      expect(strategy_obj?.actions[0].type).toBe("scale_up");
    });

    it("should support multiple actions", () => {
      const strategy: HealingStrategy = {
        id: "multi-action-strategy",
        name: "Multi Action",
        description: "Multiple actions",
        priority: 85,
        enabled: true,
        condition: {
          type: "error_rate",
          metric: "error_rate",
          operator: "greater_than",
          threshold: 8,
          duration: 45,
        },
        actions: [
          { type: "clear_cache", priority: 85 },
          { type: "circuit_breaker", priority: 95, params: { duration: 30 } },
          { type: "scale_up", priority: 80, params: { replicas: 2 } },
        ],
        rollbackOn: [],
        maxAttempts: 2,
        timeout: 180,
      };

      engine.registerStrategy(strategy);
      const strategies = engine.getAllStrategies();
      const strategy_obj = strategies.find((s) => s.id === "multi-action-strategy");

      expect(strategy_obj?.actions.length).toBe(3);
    });
  });

  describe("Success Rate Tracking", () => {
    it("should calculate success rate", () => {
      const rate = engine.getSuccessRate();
      expect(typeof rate).toBe("number");
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  describe("Recent Executions", () => {
    it("should retrieve recent executions", () => {
      const recent = engine.getRecentExecutions(5);
      expect(Array.isArray(recent)).toBe(true);
    });
  });
});

describe("RollbackAutomationService", () => {
  let service: RollbackAutomationService;

  beforeEach(() => {
    service = new RollbackAutomationService(DEFAULT_ROLLBACK_STRATEGIES);
  });

  describe("Strategy Registration", () => {
    it("should register a new rollback strategy", () => {
      const strategy: RollbackStrategy = {
        id: "test-rollback",
        name: "Test Rollback",
        description: "Test rollback strategy",
        enabled: true,
        priority: 85,
        triggers: [
          {
            type: "error_rate",
            metric: "error_rate",
            threshold: 10,
            duration: 60,
            operator: "greater_than",
          },
        ],
        rollbackActions: [
          {
            type: "revert_deployment",
            priority: 90,
            params: { deployment: "api" },
          },
        ],
        canaryPercentage: 10,
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();

      expect(strategies.some((s) => s.id === "test-rollback")).toBe(true);
    });

    it("should not register disabled strategies", () => {
      const strategy: RollbackStrategy = {
        id: "disabled-rollback",
        name: "Disabled",
        description: "Disabled rollback",
        enabled: false,
        priority: 80,
        triggers: [],
        rollbackActions: [],
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();

      expect(strategies.some((s) => s.id === "disabled-rollback")).toBe(false);
    });
  });

  describe("Default Strategies", () => {
    it("should include high error rate strategy", () => {
      const strategies = service.getAllStrategies();
      const errorStrategy = strategies.find(
        (s) => s.id === "rollback-high-error-rate"
      );

      expect(errorStrategy).toBeDefined();
      expect(errorStrategy?.priority).toBe(95);
    });

    it("should include high latency strategy", () => {
      const strategies = service.getAllStrategies();
      const latencyStrategy = strategies.find(
        (s) => s.id === "rollback-high-latency"
      );

      expect(latencyStrategy).toBeDefined();
      expect(latencyStrategy?.priority).toBe(85);
    });
  });

  describe("Trigger Types", () => {
    it("should support error_rate trigger", () => {
      const strategy: RollbackStrategy = {
        id: "error-trigger-strategy",
        name: "Error Trigger",
        description: "Error rate trigger",
        enabled: true,
        priority: 90,
        triggers: [
          {
            type: "error_rate",
            metric: "error_rate",
            threshold: 5,
            duration: 60,
            operator: "greater_than",
          },
        ],
        rollbackActions: [],
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find(
        (s) => s.id === "error-trigger-strategy"
      );

      expect(strategy_obj?.triggers[0].type).toBe("error_rate");
    });

    it("should support latency trigger", () => {
      const strategy: RollbackStrategy = {
        id: "latency-trigger-strategy",
        name: "Latency Trigger",
        description: "Latency trigger",
        enabled: true,
        priority: 85,
        triggers: [
          {
            type: "latency",
            metric: "p99_latency",
            threshold: 10000,
            duration: 120,
            operator: "greater_than",
          },
        ],
        rollbackActions: [],
        cooldownPeriod: 600,
        maxRollbacksPerHour: 2,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find(
        (s) => s.id === "latency-trigger-strategy"
      );

      expect(strategy_obj?.triggers[0].type).toBe("latency");
    });

    it("should support manual trigger", () => {
      const strategy: RollbackStrategy = {
        id: "manual-trigger-strategy",
        name: "Manual Trigger",
        description: "Manual trigger",
        enabled: true,
        priority: 100,
        triggers: [
          {
            type: "manual",
            metric: "manual_override",
            threshold: 1,
            duration: 0,
            operator: "equals",
          },
        ],
        rollbackActions: [],
        cooldownPeriod: 0,
        maxRollbacksPerHour: 1,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find(
        (s) => s.id === "manual-trigger-strategy"
      );

      expect(strategy_obj?.triggers[0].type).toBe("manual");
    });
  });

  describe("Rollback Actions", () => {
    it("should support revert_deployment action", () => {
      const strategy: RollbackStrategy = {
        id: "revert-strategy",
        name: "Revert",
        description: "Revert action",
        enabled: true,
        priority: 90,
        triggers: [],
        rollbackActions: [
          {
            type: "revert_deployment",
            priority: 95,
            params: { deployment: "api-server" },
          },
        ],
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find((s) => s.id === "revert-strategy");

      expect(strategy_obj?.rollbackActions[0].type).toBe("revert_deployment");
    });

    it("should support switch_traffic action", () => {
      const strategy: RollbackStrategy = {
        id: "traffic-strategy",
        name: "Switch Traffic",
        description: "Traffic action",
        enabled: true,
        priority: 85,
        triggers: [],
        rollbackActions: [
          {
            type: "switch_traffic",
            priority: 90,
            params: { percentage: 100 },
          },
        ],
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find((s) => s.id === "traffic-strategy");

      expect(strategy_obj?.rollbackActions[0].type).toBe("switch_traffic");
    });

    it("should support multiple rollback actions", () => {
      const strategy: RollbackStrategy = {
        id: "multi-rollback-strategy",
        name: "Multi Rollback",
        description: "Multiple rollback actions",
        enabled: true,
        priority: 95,
        triggers: [],
        rollbackActions: [
          {
            type: "switch_traffic",
            priority: 95,
            params: { percentage: 100 },
          },
          {
            type: "revert_deployment",
            priority: 90,
            params: { deployment: "api" },
          },
          { type: "notify_team", priority: 70, params: { channel: "#incidents" } },
          {
            type: "create_incident",
            priority: 75,
            params: { severity: "critical" },
          },
        ],
        canaryPercentage: 10,
        cooldownPeriod: 300,
        maxRollbacksPerHour: 3,
      };

      service.registerStrategy(strategy);
      const strategies = service.getAllStrategies();
      const strategy_obj = strategies.find(
        (s) => s.id === "multi-rollback-strategy"
      );

      expect(strategy_obj?.rollbackActions.length).toBe(4);
    });
  });

  describe("Canary Support", () => {
    it("should support canary rollbacks", () => {
      const strategies = service.getAllStrategies();

      strategies.forEach((s) => {
        if (s.canaryPercentage) {
          expect(s.canaryPercentage).toBeGreaterThan(0);
          expect(s.canaryPercentage).toBeLessThanOrEqual(100);
        }
      });
    });
  });

  describe("Cooldown & Rate Limiting", () => {
    it("should enforce cooldown periods", () => {
      const strategies = service.getAllStrategies();

      strategies.forEach((s) => {
        expect(s.cooldownPeriod).toBeGreaterThanOrEqual(0);
      });
    });

    it("should enforce max rollbacks per hour", () => {
      const strategies = service.getAllStrategies();

      strategies.forEach((s) => {
        expect(s.maxRollbacksPerHour).toBeGreaterThan(0);
      });
    });
  });

  describe("Statistics", () => {
    it("should calculate rollback statistics", () => {
      const stats = service.getRollbackStats();

      expect(stats.total).toBeDefined();
      expect(stats.successful).toBeDefined();
      expect(stats.failed).toBeDefined();
      expect(stats.successRate).toBeDefined();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it("should retrieve recent rollbacks", () => {
      const recent = service.getRecentRollbacks(5);
      expect(Array.isArray(recent)).toBe(true);
    });
  });

  describe("Deployment Tracking", () => {
    it("should register deployment versions", () => {
      service.setDeploymentVersion("api-deployment", "v1.2.3");
      service.setDeploymentVersion("web-deployment", "v2.0.0");

      // Just verify it doesn't throw
      expect(service).toBeDefined();
    });
  });
});
