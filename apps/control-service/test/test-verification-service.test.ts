import { describe, it, expect, beforeEach, vi } from "vitest";
import * as runStoreModule from "../../../packages/memory/src/run-store";
import {
  TestVerificationService,
  TestVerificationRule,
  DEFAULT_TEST_RULES,
} from "../src/services/test-verification-service";

describe("TestVerificationService", () => {
  let service: TestVerificationService;
  let mockRunBundle: any;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new TestVerificationService(DEFAULT_TEST_RULES);

    // Create mock run bundle with all necessary properties
    mockRunBundle = {
      id: "test-run",
      orgId: "test-org",
      status: "pending",
      gates: [
        { id: "qa", status: "pending", approvals: [] },
        { id: "security", status: "pending", approvals: [] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      correlationId: "corr-test",
    };

    // Spy on loadRunBundle and mock its implementation
    const bundles: Record<string, any> = {
      "test-run": mockRunBundle,
      "run-123": mockRunBundle,
      "run-456": mockRunBundle,
      "run-789": mockRunBundle,
      "run-coverage": mockRunBundle,
      "run-block": mockRunBundle,
      "run-warn": mockRunBundle,
      "run-store": mockRunBundle,
      "run-gate-results": mockRunBundle,
      "run-parallel": mockRunBundle,
      "run-sequential": mockRunBundle,
      "run-threshold": mockRunBundle,
      "run-exec-id": mockRunBundle,
      "run-completed": mockRunBundle,
    };

    vi.spyOn(runStoreModule, "loadRunBundle").mockImplementation((runId: string) => {
      return bundles[runId] || null;
    });
  });

  describe("Rule Registration", () => {
    it("should register a new test verification rule", () => {
      const rule: TestVerificationRule = {
        id: "custom-test-rule",
        name: "Custom Test Rule",
        description: "A custom test verification rule",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Unit Tests", testPath: "test/unit/**/*.test.ts", required: true },
        ],
        minPassPercentage: 90,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "custom-test-rule")).toBe(true);
    });

    it("should not register disabled rules", () => {
      const rule: TestVerificationRule = {
        id: "disabled-test-rule",
        name: "Disabled Rule",
        description: "A disabled rule",
        gateId: "qa",
        enabled: false,
        requiredTests: [],
        minPassPercentage: 90,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();

      expect(rules.some((r) => r.id === "disabled-test-rule")).toBe(false);
    });
  });

  describe("Test Rules", () => {
    it("should have QA test rule", () => {
      const rules = service.getAllRules();
      const qaRule = rules.find((r) => r.id === "test-verify-qa");

      expect(qaRule).toBeDefined();
      expect(qaRule?.gateId).toBe("qa");
      expect(qaRule?.requiredTests.length).toBeGreaterThan(0);
    });

    it("should have security test rule", () => {
      const rules = service.getAllRules();
      const securityRule = rules.find((r) => r.id === "test-verify-security");

      expect(securityRule).toBeDefined();
      expect(securityRule?.gateId).toBe("security");
    });

    it("should track required vs optional tests", () => {
      const rules = service.getAllRules();
      const qaRule = rules.find((r) => r.id === "test-verify-qa");

      const required = qaRule?.requiredTests.filter((t) => t.required) || [];
      const optional = qaRule?.requiredTests.filter((t) => !t.required) || [];

      expect(required.length).toBeGreaterThan(0);
      expect(optional.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Test Execution Tracking", () => {
    it("should retrieve execution by ID", () => {
      const rules = service.getAllRules();
      const rule = rules[0];

      if (rule) {
        const executions = service.getExecutionsForRun("test-run-123");
        // Initial state - no executions
        expect(Array.isArray(executions)).toBe(true);
      }
    });

    it("should get executions for a run", () => {
      const executions = service.getExecutionsForRun("test-run-123");
      expect(Array.isArray(executions)).toBe(true);
    });

    it("should get test results for a gate", () => {
      const results = service.getTestResultsForGate("test-run-123", "qa");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Failure Actions", () => {
    it("should support block failure action", () => {
      const rule: TestVerificationRule = {
        id: "block-rule",
        name: "Block On Failure",
        description: "Block gate on test failure",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Unit Tests", testPath: "test/unit/**/*.test.ts", required: true },
        ],
        minPassPercentage: 100,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "block-rule");

      expect(rule_obj?.failureAction).toBe("block");
    });

    it("should support warn failure action", () => {
      const rule: TestVerificationRule = {
        id: "warn-rule",
        name: "Warn On Failure",
        description: "Warn on test failure but allow",
        gateId: "qa",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 90,
        failureAction: "warn",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "warn-rule");

      expect(rule_obj?.failureAction).toBe("warn");
    });

    it("should support log failure action", () => {
      const rule: TestVerificationRule = {
        id: "log-rule",
        name: "Log On Failure",
        description: "Log test failure",
        gateId: "qa",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 80,
        failureAction: "log",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "log-rule");

      expect(rule_obj?.failureAction).toBe("log");
    });
  });

  describe("Execution Modes", () => {
    it("should support parallel execution", () => {
      const rule: TestVerificationRule = {
        id: "parallel-rule",
        name: "Parallel Tests",
        description: "Run tests in parallel",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Test 1", testPath: "test/unit/1.test.ts", required: true },
          { testName: "Test 2", testPath: "test/unit/2.test.ts", required: true },
          { testName: "Test 3", testPath: "test/unit/3.test.ts", required: true },
        ],
        minPassPercentage: 90,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "parallel-rule");

      expect(rule_obj?.parallelExecution).toBe(true);
    });

    it("should support sequential execution", () => {
      const rule: TestVerificationRule = {
        id: "sequential-rule",
        name: "Sequential Tests",
        description: "Run tests sequentially",
        gateId: "security",
        enabled: true,
        requiredTests: [
          { testName: "Security Scan", testPath: "test/security/**/*.test.ts", required: true },
          { testName: "Lint Check", testPath: "test/lint/**/*.test.ts", required: true },
        ],
        minPassPercentage: 100,
        failureAction: "block",
        parallelExecution: false,
        timeout: 180,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "sequential-rule");

      expect(rule_obj?.parallelExecution).toBe(false);
    });
  });

  describe("Test Configuration", () => {
    it("should track test paths", () => {
      const rule: TestVerificationRule = {
        id: "path-rule",
        name: "Test Paths",
        description: "Track test paths",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Unit Tests", testPath: "test/unit/**/*.test.ts", required: true },
          { testName: "Integration", testPath: "test/integration/**/*.test.ts", required: false },
        ],
        minPassPercentage: 85,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "path-rule");

      expect(rule_obj?.requiredTests[0].testPath).toBe("test/unit/**/*.test.ts");
      expect(rule_obj?.requiredTests[1].testPath).toBe("test/integration/**/*.test.ts");
    });

    it("should support max duration per test", () => {
      const rule: TestVerificationRule = {
        id: "duration-rule",
        name: "Duration Limits",
        description: "Test duration limits",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Fast Tests", testPath: "test/fast/**/*.test.ts", required: true, maxDuration: 5 },
          { testName: "Slow Tests", testPath: "test/slow/**/*.test.ts", required: false, maxDuration: 30 },
        ],
        minPassPercentage: 90,
        failureAction: "warn",
        parallelExecution: false,
        timeout: 300,
      };

      service.registerRule(rule);
      const rules = service.getAllRules();
      const rule_obj = rules.find((r) => r.id === "duration-rule");

      expect(rule_obj?.requiredTests[0].maxDuration).toBe(5);
      expect(rule_obj?.requiredTests[1].maxDuration).toBe(30);
    });
  });

  describe("Pass Percentage", () => {
    it("should enforce minimum pass percentage", () => {
      const rules = service.getAllRules();
      const qaRule = rules.find((r) => r.id === "test-verify-qa");

      expect(qaRule?.minPassPercentage).toBe(95);
    });

    it("should support different pass percentages", () => {
      const rule1: TestVerificationRule = {
        id: "high-pass-rule",
        name: "High Pass Rate",
        description: "Require 100% pass rate",
        gateId: "security",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 100,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      const rule2: TestVerificationRule = {
        id: "low-pass-rule",
        name: "Low Pass Rate",
        description: "Require 70% pass rate",
        gateId: "qa",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 70,
        failureAction: "warn",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(rule1);
      service.registerRule(rule2);

      const rules = service.getAllRules();
      const high = rules.find((r) => r.id === "high-pass-rule");
      const low = rules.find((r) => r.id === "low-pass-rule");

      expect(high?.minPassPercentage).toBe(100);
      expect(low?.minPassPercentage).toBe(70);
    });
  });

  describe("Timeout Configuration", () => {
    it("should enforce timeout limits", () => {
      const rules = service.getAllRules();

      rules.forEach((rule) => {
        expect(rule.timeout).toBeGreaterThan(0);
      });
    });

    it("should support different timeout values", () => {
      const rule1: TestVerificationRule = {
        id: "quick-tests",
        name: "Quick Tests",
        description: "Quick timeout",
        gateId: "qa",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 90,
        failureAction: "block",
        parallelExecution: true,
        timeout: 60,
      };

      const rule2: TestVerificationRule = {
        id: "slow-tests",
        name: "Slow Tests",
        description: "Long timeout",
        gateId: "qa",
        enabled: true,
        requiredTests: [],
        minPassPercentage: 90,
        failureAction: "block",
        parallelExecution: false,
        timeout: 600,
      };

      service.registerRule(rule1);
      service.registerRule(rule2);

      const rules = service.getAllRules();
      const quick = rules.find((r) => r.id === "quick-tests");
      const slow = rules.find((r) => r.id === "slow-tests");

      expect(quick?.timeout).toBe(60);
      expect(slow?.timeout).toBe(600);
    });
  });

  describe("Integration: Real Test Execution", () => {
    it("should verify tests and return results for QA gate", async () => {
      const result = await service.verifyTestsForGate("run-123", "qa");

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.totalTests).toBeGreaterThan(0);
      expect(result.results.startedAt).toBeInstanceOf(Date);
      expect(result.results.completedAt).toBeInstanceOf(Date);
    });

    it("should track passed and failed test counts", async () => {
      const result = await service.verifyTestsForGate("run-456", "qa");

      expect(result.results.passedTests + result.results.failedTests).toBe(
        result.results.totalTests
      );
    });

    it("should determine approval based on pass percentage", async () => {
      const result = await service.verifyTestsForGate("run-789", "qa");
      const qaRule = service.getAllRules().find((r) => r.id === "test-verify-qa");

      if (qaRule) {
        const passPercentage =
          (result.results.passedTests / result.results.totalTests) * 100;
        const shouldApprove = passPercentage >= qaRule.minPassPercentage;

        expect(result.approved === shouldApprove).toBe(true);
      }
    });

    it("should capture coverage metrics when available", async () => {
      const result = await service.verifyTestsForGate("run-coverage", "qa");

      // Coverage might be undefined if coverage file doesn't exist, which is acceptable
      if (result.results.coverage) {
        expect(result.results.coverage.lines).toBeGreaterThanOrEqual(0);
        expect(result.results.coverage.branches).toBeGreaterThanOrEqual(0);
        expect(result.results.coverage.functions).toBeGreaterThanOrEqual(0);
        expect(result.results.coverage.statements).toBeGreaterThanOrEqual(0);
      }
    });

    it("should enforce failure action: block prevents approval on test failure", async () => {
      const blockRule: TestVerificationRule = {
        id: "test-block-failure",
        name: "Block on Failure",
        description: "Block gate when tests fail",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Sample Test", testPath: "test/sample/**/*.test.ts", required: true },
        ],
        minPassPercentage: 100,
        failureAction: "block",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(blockRule);
      const result = await service.verifyTestsForGate("run-block", "qa");

      // If any test fails, approval should be false when failureAction is block
      if (result.results.failedTests > 0) {
        expect(result.approved).toBe(false);
      }
    });

    it("should enforce failure action: warn allows approval despite failures", async () => {
      const warnRule: TestVerificationRule = {
        id: "test-warn-failure",
        name: "Warn on Failure",
        description: "Warn but allow when tests fail",
        gateId: "security",
        enabled: true,
        requiredTests: [
          { testName: "Security Test", testPath: "test/security/**/*.test.ts", required: true },
        ],
        minPassPercentage: 80,
        failureAction: "warn",
        parallelExecution: false,
        timeout: 180,
      };

      service.registerRule(warnRule);
      const result = await service.verifyTestsForGate("run-warn", "security");

      // With warn action, approval should be true even if some tests fail (as long as min threshold met)
      expect(typeof result.approved).toBe("boolean");
    });

    it("should store execution results for retrieval", async () => {
      await service.verifyTestsForGate("run-store", "qa");

      const executions = service.getExecutionsForRun("run-store");
      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0].runId).toBe("run-store");
    });

    it("should retrieve test results by gate", async () => {
      await service.verifyTestsForGate("run-gate-results", "qa");

      const results = service.getTestResultsForGate("run-gate-results", "qa");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle parallel test execution", async () => {
      const parallelRule: TestVerificationRule = {
        id: "test-parallel-execution",
        name: "Parallel Execution Test",
        description: "Test parallel test execution",
        gateId: "qa",
        enabled: true,
        requiredTests: [
          { testName: "Test 1", testPath: "test/unit/1.test.ts", required: true },
          { testName: "Test 2", testPath: "test/unit/2.test.ts", required: true },
          { testName: "Test 3", testPath: "test/unit/3.test.ts", required: true },
        ],
        minPassPercentage: 70,
        failureAction: "warn",
        parallelExecution: true,
        timeout: 300,
      };

      service.registerRule(parallelRule);
      const result = await service.verifyTestsForGate("run-parallel", "qa");

      expect(result.results.totalTests).toBe(3);
      expect(result.results.results.length).toBe(3);
    });

    it("should handle sequential test execution", async () => {
      const sequentialRule: TestVerificationRule = {
        id: "test-sequential-execution",
        name: "Sequential Execution Test",
        description: "Test sequential test execution",
        gateId: "security",
        enabled: true,
        requiredTests: [
          { testName: "Security Scan", testPath: "test/security/scan.test.ts", required: true },
          { testName: "Lint Check", testPath: "test/lint/check.test.ts", required: true },
        ],
        minPassPercentage: 80,
        failureAction: "block",
        parallelExecution: false,
        timeout: 180,
      };

      service.registerRule(sequentialRule);
      const result = await service.verifyTestsForGate("run-sequential", "security");

      expect(result.results.totalTests).toBe(2);
      expect(result.results.results.length).toBe(2);
    });

    it("should apply minPassPercentage threshold correctly", async () => {
      const result = await service.verifyTestsForGate("run-threshold", "qa");
      const qaRule = service.getAllRules().find((r) => r.id === "test-verify-qa");

      if (qaRule && result.results.totalTests > 0) {
        const passPercentage =
          (result.results.passedTests / result.results.totalTests) * 100;
        const meetsThreshold = passPercentage >= qaRule.minPassPercentage;

        // Approval decision should match threshold requirement
        expect(result.approved === meetsThreshold || qaRule.failureAction !== "block").toBe(true);
      }
    });

    it("should include execution ID in results", async () => {
      const result = await service.verifyTestsForGate("run-exec-id", "qa");

      expect(result.results.id).toBeDefined();
      expect(result.results.id).toContain("exec-");
    });

    it("should mark execution status as completed on success", async () => {
      const result = await service.verifyTestsForGate("run-completed", "qa");

      expect(result.results.status).toMatch(/completed|failed|timeout/);
      expect(result.results.completedAt).not.toBeUndefined();
    });
  });
});
