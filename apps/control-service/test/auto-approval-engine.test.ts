import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AutoApprovalEngine,
  AutoApprovalRule,
  DEFAULT_AUTO_APPROVAL_RULES,
} from "../src/services/auto-approval-engine";

describe("AutoApprovalEngine", () => {
  let engine: AutoApprovalEngine;

  beforeEach(() => {
    engine = new AutoApprovalEngine(DEFAULT_AUTO_APPROVAL_RULES);
  });

  describe("Rule Registration", () => {
    it("should register a new rule", () => {
      const rule: AutoApprovalRule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe("test-rule");
    });

    it("should not register disabled rules", () => {
      const rule: AutoApprovalRule = {
        id: "disabled-rule",
        name: "Disabled Rule",
        description: "A disabled rule",
        gateId: "security",
        priority: 50,
        enabled: false,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");

      expect(rules.filter((r) => r.id === "disabled-rule")).toHaveLength(0);
    });
  });

  describe("Approval Chain Creation", () => {
    it("should create an approval chain", () => {
      const chain = engine.createApprovalChain("run-123", ["gate-1", "gate-2", "gate-3"]);

      expect(chain.runId).toBe("run-123");
      expect(chain.gates).toHaveLength(3);
      expect(chain.status).toBe("pending");
    });

    it("should retrieve approval chain by ID", () => {
      const chain = engine.createApprovalChain("run-123", ["gate-1"]);

      const retrieved = engine.getApprovalChain(chain.chainId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.runId).toBe("run-123");
    });

    it("should get all chains for a run", () => {
      engine.createApprovalChain("run-123", ["gate-1"]);
      engine.createApprovalChain("run-123", ["gate-2"]);
      engine.createApprovalChain("run-456", ["gate-1"]);

      const chains = engine.getChainsForRun("run-123");
      expect(chains).toHaveLength(2);
    });
  });

  describe("Rule Retrieval", () => {
    it("should get all enabled rules", () => {
      const rules = engine.getAllRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.enabled)).toBe(true);
    });

    it("should get rules for a specific gate", () => {
      const rules = engine.getRulesForGate("security");
      expect(rules.every((r) => r.gateId === "security")).toBe(true);
    });

    it("should return empty array for gate with no rules", () => {
      const rules = engine.getRulesForGate("nonexistent-gate");
      expect(rules).toHaveLength(0);
    });
  });

  describe("Default Rules", () => {
    it("should include low-risk auto-approval rule", () => {
      const rules = engine.getAllRules();
      const lowRiskRule = rules.find((r) => r.id === "auto-approve-low-risk");

      expect(lowRiskRule).toBeDefined();
      expect(lowRiskRule?.conditions.length).toBeGreaterThan(0);
    });

    it("should include documentation auto-approval rule", () => {
      const rules = engine.getAllRules();
      const docRule = rules.find((r) => r.id === "auto-approve-documentation");

      expect(docRule).toBeDefined();
      expect(docRule?.priority).toBeGreaterThan(80);
    });
  });

  describe("Condition Types", () => {
    it("should support test_pass condition", () => {
      const rule: AutoApprovalRule = {
        id: "test-pass-rule",
        name: "Test Pass Rule",
        description: "Test pass condition",
        gateId: "qa",
        priority: 60,
        enabled: true,
        conditions: [{ type: "test_pass", operator: "equals", value: true }],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      expect(engine.getRulesForGate("qa")).toContainEqual(expect.objectContaining({ id: "test-pass-rule" }));
    });

    it("should support coverage_threshold condition", () => {
      const rule: AutoApprovalRule = {
        id: "coverage-rule",
        name: "Coverage Rule",
        description: "Coverage threshold condition",
        gateId: "security",
        priority: 70,
        enabled: true,
        conditions: [{ type: "coverage_threshold", operator: "greater_than", value: 80 }],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      expect(engine.getRulesForGate("security")).toContainEqual(expect.objectContaining({ id: "coverage-rule" }));
    });

    it("should support quality_score condition", () => {
      const rule: AutoApprovalRule = {
        id: "quality-rule",
        name: "Quality Rule",
        description: "Quality score condition",
        gateId: "architecture",
        priority: 75,
        enabled: true,
        conditions: [{ type: "quality_score", operator: "greater_than", value: 85 }],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      expect(engine.getRulesForGate("architecture")).toContainEqual(
        expect.objectContaining({ id: "quality-rule" })
      );
    });

    it("should support timeout condition", () => {
      const rule: AutoApprovalRule = {
        id: "timeout-rule",
        name: "Timeout Rule",
        description: "Timeout condition",
        gateId: "deployment",
        priority: 40,
        enabled: true,
        conditions: [{ type: "timeout", operator: "greater_than", value: 60 }],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      expect(engine.getRulesForGate("deployment")).toContainEqual(
        expect.objectContaining({ id: "timeout-rule" })
      );
    });
  });

  describe("Action Types", () => {
    it("should support approve action", () => {
      const rule: AutoApprovalRule = {
        id: "approve-action-rule",
        name: "Approve Action",
        description: "Test approve action",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve", config: { reason: "Auto-approved" } }],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");
      const rule_obj = rules.find((r) => r.id === "approve-action-rule");

      expect(rule_obj?.actions[0].type).toBe("approve");
      expect(rule_obj?.actions[0].config?.reason).toBe("Auto-approved");
    });

    it("should support log action", () => {
      const rule: AutoApprovalRule = {
        id: "log-action-rule",
        name: "Log Action",
        description: "Test log action",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "log", config: { message: "Test message" } }],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");
      const rule_obj = rules.find((r) => r.id === "log-action-rule");

      expect(rule_obj?.actions[0].type).toBe("log");
    });

    it("should support multiple actions", () => {
      const rule: AutoApprovalRule = {
        id: "multi-action-rule",
        name: "Multi Action",
        description: "Test multiple actions",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [
          { type: "approve" },
          { type: "log", config: { message: "Approved" } },
          { type: "notify" },
        ],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");
      const rule_obj = rules.find((r) => r.id === "multi-action-rule");

      expect(rule_obj?.actions).toHaveLength(3);
    });
  });

  describe("Priority Handling", () => {
    it("should prioritize higher priority rules", () => {
      const lowPriorityRule: AutoApprovalRule = {
        id: "low-priority",
        name: "Low Priority",
        description: "Low priority rule",
        gateId: "security",
        priority: 20,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      const highPriorityRule: AutoApprovalRule = {
        id: "high-priority",
        name: "High Priority",
        description: "High priority rule",
        gateId: "security",
        priority: 90,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(lowPriorityRule);
      engine.registerRule(highPriorityRule);

      const rules = engine.getRulesForGate("security");
      const sorted = rules.sort((a, b) => b.priority - a.priority);

      expect(sorted[0].id).toBe("high-priority");
      expect(sorted[sorted.length - 1].id).toBe("low-priority");
    });
  });

  describe("Dependencies", () => {
    it("should track dependencies in rules", () => {
      const rule: AutoApprovalRule = {
        id: "dependent-rule",
        name: "Dependent Rule",
        description: "Rule with dependencies",
        gateId: "deployment",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: ["security", "qa", "architecture"],
        actions: [{ type: "approve" }],
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("deployment");
      const rule_obj = rules.find((r) => r.id === "dependent-rule");

      expect(rule_obj?.dependencies).toContain("security");
      expect(rule_obj?.dependencies).toContain("qa");
      expect(rule_obj?.dependencies).toContain("architecture");
    });
  });

  describe("Metadata", () => {
    it("should store and retrieve metadata", () => {
      const rule: AutoApprovalRule = {
        id: "metadata-rule",
        name: "Metadata Rule",
        description: "Rule with metadata",
        gateId: "security",
        priority: 50,
        enabled: true,
        conditions: [],
        dependencies: [],
        actions: [{ type: "approve" }],
        metadata: {
          team: "backend",
          slackChannel: "#approvals",
          escalationLevel: 2,
        },
      };

      engine.registerRule(rule);
      const rules = engine.getRulesForGate("security");
      const rule_obj = rules.find((r) => r.id === "metadata-rule");

      expect(rule_obj?.metadata?.team).toBe("backend");
      expect(rule_obj?.metadata?.escalationLevel).toBe(2);
    });
  });
});
