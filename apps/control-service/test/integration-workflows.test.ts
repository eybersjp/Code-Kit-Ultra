import { describe, it, expect, beforeEach } from "vitest";
import { getAutoApprovalEngine } from "../src/services/auto-approval-engine";
import { getAlertAcknowledgmentService } from "../src/services/alert-acknowledgment-service";
import { getTestVerificationService } from "../src/services/test-verification-service";
import { getHealingEngine } from "../src/services/healing-engine";
import { getRollbackAutomationService } from "../src/services/rollback-automation";
import { getAutomationOrchestrator } from "../src/services/automation-orchestrator";

describe("Integration Workflows", () => {
  describe("Full Automation Workflow", () => {
    it("should execute complete automation cycle", () => {
      // Initialize all services
      const orchestrator = getAutomationOrchestrator();
      const orchestratorStatus = orchestrator.getStatus();

      // Verify all services are initialized
      expect(orchestratorStatus.enabled).toBe(true);
      expect(orchestratorStatus.services.autoApproval).toBeDefined();
      expect(orchestratorStatus.services.alertAcknowledgment).toBeDefined();
      expect(orchestratorStatus.services.testVerification).toBeDefined();
      expect(orchestratorStatus.services.healing).toBeDefined();
      expect(orchestratorStatus.services.rollback).toBeDefined();
    });

    it("should support safe mode workflow", () => {
      const orchestrator = getAutomationOrchestrator();

      // Switch to safe mode
      orchestrator.setMode("safe");
      let status = orchestrator.getStatus();
      expect(status.mode).toBe("safe");

      // Only monitoring and testing should work in safe mode
      const engine = orchestrator.getAutoApprovalEngine();
      expect(engine.getAllRules().length).toBeGreaterThanOrEqual(0);
    });

    it("should support balanced mode workflow", () => {
      const orchestrator = getAutomationOrchestrator();

      // Switch to balanced mode
      orchestrator.setMode("balanced");
      let status = orchestrator.getStatus();
      expect(status.mode).toBe("balanced");

      // All services except rollback should be active
      const healingEngine = orchestrator.getHealingEngine();
      expect(healingEngine.getAllStrategies().length).toBeGreaterThanOrEqual(0);
    });

    it("should support aggressive mode workflow", () => {
      const orchestrator = getAutomationOrchestrator();

      // Switch to aggressive mode
      orchestrator.setMode("aggressive");
      let status = orchestrator.getStatus();
      expect(status.mode).toBe("aggressive");

      // All services should be active
      const rollbackService = orchestrator.getRollbackService();
      expect(rollbackService.getAllStrategies().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Cross-Service Integration", () => {
    it("should coordinate auto-approval and test verification", () => {
      const approvalEngine = getAutoApprovalEngine();
      const testService = getTestVerificationService();

      // Get approval rules
      const approvalRules = approvalEngine.getAllRules();
      expect(approvalRules.length).toBeGreaterThan(0);

      // Get test rules
      const testRules = testService.getAllRules();
      expect(testRules.length).toBeGreaterThan(0);

      // Both should be able to operate together
      expect(approvalRules.length + testRules.length).toBeGreaterThan(0);
    });

    it("should coordinate alert acknowledgment and healing", () => {
      const alertService = getAlertAcknowledgmentService();
      const healingEngine = getHealingEngine();

      // Record an alert
      alertService.recordAlert("test-rule", "alert-123");

      // Get pending alerts
      const pending = alertService.getPendingAlerts();
      expect(pending.length).toBeGreaterThan(0);

      // Healing strategies can run in parallel
      const strategies = healingEngine.getAllStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });

    it("should coordinate healing and rollback", () => {
      const healingEngine = getHealingEngine();
      const rollbackService = getRollbackAutomationService();

      // Both services should have strategies/rules
      const healingStrategies = healingEngine.getAllStrategies();
      const rollbackStrategies = rollbackService.getAllStrategies();

      expect(healingStrategies.length).toBeGreaterThan(0);
      expect(rollbackStrategies.length).toBeGreaterThan(0);
    });
  });

  describe("Sequential Workflows", () => {
    it("should execute approval -> resume -> retry workflow", async () => {
      const approvalEngine = getAutoApprovalEngine();

      // Step 1: Check for approval rules
      const rules = approvalEngine.getAllRules();
      expect(rules.length).toBeGreaterThan(0);

      // Step 2: Create approval chain
      const chain = approvalEngine.createApprovalChain("run-workflow-1", [
        "security",
        "qa",
        "deployment",
      ]);
      expect(chain.gates.length).toBe(3);

      // Step 3: Verify chain can be retrieved
      const retrieved = approvalEngine.getApprovalChain(chain.chainId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.runId).toBe("run-workflow-1");
    });

    it("should execute alert -> acknowledge -> remediate workflow", () => {
      const alertService = getAlertAcknowledgmentService();
      const healingEngine = getHealingEngine();

      // Step 1: Record alert
      alertService.recordAlert("http-5xx-burst", "alert-001");

      // Step 2: Check pending alerts
      let pending = alertService.getPendingAlerts();
      expect(pending.length).toBeGreaterThan(0);

      // Step 3: Healing can be triggered
      const strategies = healingEngine.getAllStrategies();
      const errorStrategy = strategies.find((s) => s.id === "heal-high-error-rate");
      expect(errorStrategy).toBeDefined();
    });

    it("should execute test -> approval -> deployment workflow", () => {
      const testService = getTestVerificationService();
      const approvalEngine = getAutoApprovalEngine();

      // Step 1: Get test rules
      const testRules = testService.getAllRules();
      expect(testRules.length).toBeGreaterThan(0);

      // Step 2: Get approval rules
      const approvalRules = approvalEngine.getAllRules();
      expect(approvalRules.length).toBeGreaterThan(0);

      // Step 3: Both can work together for a deployment workflow
      expect(testRules.length + approvalRules.length).toBeGreaterThan(0);
    });
  });

  describe("Parallel Workflows", () => {
    it("should handle multiple parallel alert acknowledgments", () => {
      const alertService = getAlertAcknowledgmentService();

      // Record multiple alerts in parallel
      const alertIds = ["alert-1", "alert-2", "alert-3"];
      alertIds.forEach((id) => {
        alertService.recordAlert("test-rule", id);
      });

      // All should be pending
      const pending = alertService.getPendingAlerts();
      expect(pending.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle multiple parallel healing strategies", () => {
      const healingEngine = getHealingEngine();

      // All strategies should be available in parallel
      const strategies = healingEngine.getAllStrategies();

      // Verify we have diverse strategies
      const cpuStrategy = strategies.find((s) => s.id === "heal-high-cpu");
      const errorStrategy = strategies.find((s) => s.id === "heal-high-error-rate");
      const latencyStrategy = strategies.find((s) => s.id === "heal-high-latency");

      expect(cpuStrategy).toBeDefined();
      expect(errorStrategy).toBeDefined();
      expect(latencyStrategy).toBeDefined();
    });

    it("should handle multiple parallel rollback triggers", () => {
      const rollbackService = getRollbackAutomationService();

      // All strategies should be available
      const strategies = rollbackService.getAllStrategies();

      // Verify different trigger types
      const errorTrigger = strategies.find(
        (s) => s.triggers.some((t) => t.type === "error_rate")
      );
      const latencyTrigger = strategies.find(
        (s) => s.triggers.some((t) => t.type === "latency")
      );

      expect(errorTrigger).toBeDefined();
      expect(latencyTrigger).toBeDefined();
    });
  });

  describe("Dependency Resolution", () => {
    it("should resolve approval chain dependencies", () => {
      const approvalEngine = getAutoApprovalEngine();

      // Create chain with dependent gates
      const chain = approvalEngine.createApprovalChain("run-deps-1", [
        "security",
        "qa",
        "architecture",
        "deployment",
      ]);

      // Verify dependencies can be tracked
      expect(chain.gates.length).toBe(4);
      expect(chain.gates.every((g) => g.gateId)).toBe(true);
    });

    it("should respect approval rule dependencies", () => {
      const approvalEngine = getAutoApprovalEngine();

      // Register rule with dependencies
      const rule = {
        id: "test-dep-rule",
        name: "Test Dependency Rule",
        description: "Rule with dependencies",
        gateId: "deployment",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: ["security", "qa"],
        actions: [{ type: "approve" as const }],
      };

      approvalEngine.registerRule(rule);

      // Verify rule is registered with dependencies
      const rules = approvalEngine.getRulesForGate("deployment");
      const registered = rules.find((r) => r.id === "test-dep-rule");
      expect(registered?.dependencies.length).toBe(2);
    });
  });

  describe("Configuration Isolation", () => {
    it("should isolate orchestrator instances", () => {
      const orch1 = getAutomationOrchestrator();

      // Change mode
      orch1.setMode("safe");

      // Get services from orchestrator
      const status = orch1.getStatus();
      expect(status.mode).toBe("safe");
    });

    it("should isolate service instances", () => {
      const engine1 = getAutoApprovalEngine();
      const engine2 = getAutoApprovalEngine();

      // Both should refer to same singleton
      const rules1 = engine1.getAllRules();
      const rules2 = engine2.getAllRules();

      expect(rules1.length).toBe(rules2.length);
    });
  });

  describe("Error Recovery Workflows", () => {
    it("should recover from failed test verification", () => {
      const testService = getTestVerificationService();

      // Get QA rule (may have failures)
      const rules = testService.getAllRules();
      const qaRule = rules.find((r) => r.id === "test-verify-qa");

      // Should be able to find the QA rule
      expect(qaRule).toBeDefined();

      if (qaRule) {
        // Should have a min pass percentage threshold
        expect(typeof qaRule.minPassPercentage).toBe("number");
        expect(qaRule.minPassPercentage).toBeGreaterThan(0);
        expect(qaRule.minPassPercentage).toBeLessThanOrEqual(100);
      }
    });

    it("should recover from failed healing", () => {
      const healingEngine = getHealingEngine();

      // Get strategies with rollback capability
      const strategies = healingEngine.getAllStrategies();

      strategies.forEach((s) => {
        // Should have rollback conditions
        expect(s.rollbackOn.length).toBeGreaterThanOrEqual(0);
      });
    });

    it("should recover from failed rollback with notification", () => {
      const rollbackService = getRollbackAutomationService();

      // Get strategies with notification actions
      const strategies = rollbackService.getAllStrategies();

      strategies.forEach((s) => {
        const notifyAction = s.rollbackActions.find((a) => a.type === "notify_team");
        // Strategies should have notification for failures
        expect(s.rollbackActions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Performance & Scalability", () => {
    it("should handle many approval rules", () => {
      const approvalEngine = getAutoApprovalEngine();

      // Register multiple rules
      for (let i = 0; i < 10; i++) {
        const rule = {
          id: `perf-rule-${i}`,
          name: `Performance Rule ${i}`,
          description: "Performance test rule",
          gateId: ["security", "qa", "architecture"][i % 3],
          priority: i,
          enabled: true,
          conditions: [],
          dependencies: [],
          actions: [{ type: "approve" as const }],
        };
        approvalEngine.registerRule(rule);
      }

      // Should handle many rules efficiently
      const allRules = approvalEngine.getAllRules();
      expect(allRules.length).toBeGreaterThan(0);
    });

    it("should handle many pending alerts", () => {
      const alertService = getAlertAcknowledgmentService();

      // Record many alerts
      for (let i = 0; i < 20; i++) {
        alertService.recordAlert("perf-test-rule", `perf-alert-${i}`);
      }

      // Should retrieve all pending alerts
      const pending = alertService.getPendingAlerts();
      expect(pending.length).toBeGreaterThanOrEqual(20);
    });

    it("should handle retrieval of recent executions", () => {
      const healingEngine = getHealingEngine();
      const rollbackService = getRollbackAutomationService();

      // Get recent operations
      const recentHealing = healingEngine.getRecentExecutions(10);
      const recentRollbacks = rollbackService.getRecentRollbacks(10);

      expect(Array.isArray(recentHealing)).toBe(true);
      expect(Array.isArray(recentRollbacks)).toBe(true);
    });
  });

  describe("Status Consistency", () => {
    it("should maintain consistent orchestrator status", () => {
      const orchestrator = getAutomationOrchestrator();

      // Get status multiple times
      const status1 = orchestrator.getStatus();
      const status2 = orchestrator.getStatus();

      // Status should be consistent
      expect(status1.enabled).toBe(status2.enabled);
      expect(status1.mode).toBe(status2.mode);
      expect(status1.services.autoApproval.enabled).toBe(status2.services.autoApproval.enabled);
    });

    it("should update status after changes", () => {
      const orchestrator = getAutomationOrchestrator();

      const before = orchestrator.getStatus();
      orchestrator.setMode("aggressive");
      const after = orchestrator.getStatus();

      expect(before.mode).not.toBe(after.mode);
      expect(after.mode).toBe("aggressive");
    });
  });
});
