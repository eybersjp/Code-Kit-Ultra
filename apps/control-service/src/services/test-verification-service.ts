import { loadRunBundle, updateRunState } from "../../../../packages/memory/src/run-store";
import { logger } from "../../../../packages/shared/src/logger";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Test Result
 */
export interface TestResult {
  testId: string;
  testName: string;
  status: "passed" | "failed" | "skipped" | "pending";
  duration: number; // milliseconds
  error?: string;
  stdout?: string;
  stderr?: string;
  timestamp: Date;
}

/**
 * Test Verification Rule
 * Defines which tests must pass before gate approval
 */
export interface TestVerificationRule {
  id: string;
  name: string;
  description: string;
  gateId: string;
  enabled: boolean;
  requiredTests: RequiredTest[];
  minPassPercentage: number; // 0-100
  failureAction: "block" | "warn" | "log";
  parallelExecution: boolean;
  timeout: number; // seconds
}

export interface RequiredTest {
  testName: string;
  testPath: string;
  required: boolean; // If true, test must pass for approval
  maxDuration?: number; // seconds
}

/**
 * Test Suite Execution
 */
export interface TestSuiteExecution {
  id: string;
  runId: string;
  gateId: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  startedAt: Date;
  completedAt?: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  coverage?: CoverageMetrics;
}

export interface CoverageMetrics {
  lines: number; // percentage
  branches: number;
  functions: number;
  statements: number;
}

/**
 * Test Verification Service
 * Automatically runs and verifies tests on gate approval
 */
export class TestVerificationService {
  private rules: Map<string, TestVerificationRule> = new Map();
  private executions: Map<string, TestSuiteExecution> = new Map();

  constructor(rules: TestVerificationRule[] = []) {
    rules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  /**
   * Register a test verification rule
   */
  registerRule(rule: TestVerificationRule): void {
    if (!rule.enabled) {
      logger.info({ ruleId: rule.id }, "Test verification rule disabled");
      return;
    }
    this.rules.set(rule.id, rule);
    logger.info(
      { ruleId: rule.id, testCount: rule.requiredTests.length },
      "Registered test verification rule"
    );
  }

  /**
   * Verify tests before gate approval
   */
  async verifyTestsForGate(
    runId: string,
    gateId: string
  ): Promise<{ approved: boolean; results: TestSuiteExecution }> {
    const bundle = loadRunBundle(runId);
    if (!bundle) {
      throw new Error(`Run ${runId} not found`);
    }

    // Find applicable rules
    const applicableRules = Array.from(this.rules.values()).filter(
      (rule) => rule.gateId === gateId && rule.enabled
    );

    if (applicableRules.length === 0) {
      logger.debug({ gateId }, "No test verification rules for gate");
      return { approved: true, results: this.createEmptyExecution(runId, gateId) };
    }

    // Execute tests for the most specific rule
    const rule = applicableRules[0];
    const execution = await this.runTests(runId, gateId, rule);

    // Determine if tests passed and gate should be approved
    const approved = this.isApproved(execution, rule);

    // Store execution results
    this.executions.set(execution.id, execution);

    logger.info(
      {
        executionId: execution.id,
        approved,
        passed: execution.passedTests,
        failed: execution.failedTests,
        ruleId: rule.id,
      },
      "Test verification completed"
    );

    return { approved, results: execution };
  }

  /**
   * Run tests for a gate
   */
  private async runTests(
    runId: string,
    gateId: string,
    rule: TestVerificationRule
  ): Promise<TestSuiteExecution> {
    const executionId = `exec-${runId}-${gateId}-${Date.now()}`;
    const execution: TestSuiteExecution = {
      id: executionId,
      runId,
      gateId,
      status: "running",
      startedAt: new Date(),
      totalTests: rule.requiredTests.length,
      passedTests: 0,
      failedTests: 0,
      results: [],
    };

    try {
      const timeoutMs = rule.timeout * 1000;

      const results = await Promise.race([
        rule.parallelExecution
          ? this.runTestsParallel(rule.requiredTests)
          : this.runTestsSequential(rule.requiredTests),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Test suite timeout")),
            timeoutMs
          )
        ),
      ]);

      execution.results = results;
      execution.passedTests = results.filter((r) => r.status === "passed").length;
      execution.failedTests = results.filter((r) => r.status === "failed").length;

      execution.coverage = await this.calculateCoverage(results);

      execution.status = "completed";
      execution.completedAt = new Date();
    } catch (err: any) {
      logger.error({ err, executionId }, "Test execution failed");
      execution.status = err.message.includes("timeout") ? "timeout" : "failed";
      execution.completedAt = new Date();
    }

    return execution;
  }

  /**
   * Run tests in parallel
   */
  private async runTestsParallel(tests: RequiredTest[]): Promise<TestResult[]> {
    const promises = tests.map((test) => this.executeTest(test));
    return Promise.all(promises);
  }

  /**
   * Run tests sequentially
   */
  private async runTestsSequential(tests: RequiredTest[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await this.executeTest(test);
      results.push(result);
    }
    return results;
  }

  /**
   * Execute a single test
   */
  private async executeTest(test: RequiredTest): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const testCommand = this.getTestCommand(test.testPath);
      const [command, ...args] = testCommand.split(" ");

      const timeoutMs = (test.maxDuration || 60) * 1000;

      const { stdout, stderr } = await Promise.race([
        execFileAsync(command, args, {
          cwd: process.cwd(),
          timeout: timeoutMs,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Test execution timeout")),
            timeoutMs
          )
        ),
      ]);

      const duration = Date.now() - startTime;
      const passed = !stdout.includes("FAIL") && !stderr.includes("error");

      return {
        testId: test.testName,
        testName: test.testName,
        status: passed ? "passed" : "failed",
        duration,
        stdout,
        stderr: stderr || undefined,
        timestamp: new Date(),
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      return {
        testId: test.testName,
        testName: test.testName,
        status: "failed",
        duration,
        error: err.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Determine test command from test path pattern
   */
  private getTestCommand(testPath: string): string {
    if (testPath.includes("unit")) {
      return "pnpm run test:unit";
    } else if (testPath.includes("integration")) {
      return "pnpm run test:integration";
    } else if (testPath.includes("security")) {
      return "pnpm run test:security";
    } else if (testPath.includes("lint")) {
      return "pnpm lint";
    }
    return "pnpm run test:all";
  }

  /**
   * Calculate code coverage from coverage report
   */
  private async calculateCoverage(results: TestResult[]): Promise<CoverageMetrics | undefined> {
    if (results.length === 0) {
      return undefined;
    }

    try {
      const coveragePath = join(
        process.cwd(),
        "coverage/coverage-summary.json"
      );
      const coverageData = JSON.parse(readFileSync(coveragePath, "utf8"));

      const total = coverageData.total;

      return {
        lines: Math.round(total.lines.pct * 100) / 100,
        branches: Math.round(total.branches.pct * 100) / 100,
        functions: Math.round(total.functions.pct * 100) / 100,
        statements: Math.round(total.statements.pct * 100) / 100,
      };
    } catch (err: any) {
      logger.warn({ err }, "Failed to parse coverage metrics");
      return undefined;
    }
  }

  /**
   * Determine if gate should be approved based on test results
   */
  private isApproved(execution: TestSuiteExecution, rule: TestVerificationRule): boolean {
    if (execution.status === "failed" || execution.status === "timeout") {
      return rule.failureAction === "log" || rule.failureAction === "warn";
    }

    const passPercentage = (execution.passedTests / execution.totalTests) * 100;
    return passPercentage >= rule.minPassPercentage;
  }

  /**
   * Format test results for storage
   */
  private formatTestResults(
    execution: TestSuiteExecution
  ): Record<string, TestResult> {
    const formatted: Record<string, TestResult> = {};
    execution.results.forEach((result) => {
      formatted[result.testId] = result;
    });
    return formatted;
  }

  /**
   * Create empty execution (when no rules apply)
   */
  private createEmptyExecution(runId: string, gateId: string): TestSuiteExecution {
    return {
      id: `exec-${runId}-${gateId}-${Date.now()}`,
      runId,
      gateId,
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      results: [],
    };
  }

  /**
   * Get test execution by ID
   */
  getExecution(executionId: string): TestSuiteExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get executions for a run
   */
  getExecutionsForRun(runId: string): TestSuiteExecution[] {
    return Array.from(this.executions.values()).filter((exec) => exec.runId === runId);
  }

  /**
   * Get test results for a gate
   */
  getTestResultsForGate(runId: string, gateId: string): TestResult[] {
    const executions = this.getExecutionsForRun(runId);
    const gateExecution = executions.find((exec) => exec.gateId === gateId);
    return gateExecution?.results || [];
  }

  /**
   * Get all rules
   */
  getAllRules(): TestVerificationRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }
}

/**
 * Default test verification rules
 */
export const DEFAULT_TEST_RULES: TestVerificationRule[] = [
  {
    id: "test-verify-qa",
    name: "QA Gate - Require Passing Tests",
    description: "All tests must pass before QA gate approval",
    gateId: "qa",
    enabled: true,
    requiredTests: [
      { testName: "Unit Tests", testPath: "test/unit/**/*.test.ts", required: true },
      { testName: "Integration Tests", testPath: "test/integration/**/*.test.ts", required: true },
      { testName: "API Tests", testPath: "test/api/**/*.test.ts", required: false },
    ],
    minPassPercentage: 95,
    failureAction: "block",
    parallelExecution: true,
    timeout: 300,
  },
  {
    id: "test-verify-security",
    name: "Security Gate - Security and Lint Tests",
    description: "Security and linting tests must pass",
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
  },
];

// Singleton instance
let instance: TestVerificationService | null = null;

export function getTestVerificationService(): TestVerificationService {
  if (!instance) {
    instance = new TestVerificationService(DEFAULT_TEST_RULES);
  }
  return instance;
}
