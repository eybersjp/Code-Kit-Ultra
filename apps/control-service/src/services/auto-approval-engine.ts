// @ts-nocheck
import { loadRunBundle, updateRunState } from "../../../../packages/memory/src/run-store";
import { ApprovalService } from "./approval-service";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder";
import { logger } from "../../../../packages/shared/src/logger";

/**
 * Auto-Approval Rule Definition
 * Defines conditions under which a gate can be automatically approved
 */
export interface AutoApprovalRule {
  id: string;
  name: string;
  description: string;
  gateId: string;
  priority: number; // 0-100, higher = higher priority
  enabled: boolean;
  conditions: ApprovalCondition[];
  dependencies: string[]; // Other gate IDs that must be approved first
  actions: AutoApprovalAction[];
  metadata?: Record<string, any>;
}

export interface ApprovalCondition {
  type: "test_pass" | "coverage_threshold" | "quality_score" | "timeout" | "manual";
  operator: "equals" | "greater_than" | "less_than" | "contains";
  value: any;
}

export interface AutoApprovalAction {
  type: "approve" | "log" | "escalate" | "notify";
  config?: Record<string, any>;
}

export interface ApprovalChain {
  runId: string;
  chainId: string;
  gates: GateNode[];
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

export interface GateNode {
  gateId: string;
  status: "pending" | "approved" | "rejected" | "failed";
  approvalRule?: AutoApprovalRule;
  dependencies: string[]; // Gate IDs that must be completed first
  result?: {
    approvedAt: Date;
    approvedBy: string;
    reason: string;
  };
}

/**
 * Auto-Approval Engine
 * Manages automatic approval chains with dependency resolution
 */
export class AutoApprovalEngine {
  private rules: Map<string, AutoApprovalRule> = new Map();
  private chains: Map<string, ApprovalChain> = new Map();

  constructor(rules: AutoApprovalRule[] = []) {
    rules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  /**
   * Register an auto-approval rule
   */
  registerRule(rule: AutoApprovalRule): void {
    if (!rule.enabled) {
      logger.info({ ruleId: rule.id }, "Rule disabled, not registering");
      return;
    }
    this.rules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name }, "Registered auto-approval rule");
  }

  /**
   * Create an approval chain for a run
   */
  createApprovalChain(runId: string, gateIds: string[]): ApprovalChain {
    const chainId = `chain-${runId}-${Date.now()}`;
    const gates: GateNode[] = gateIds.map((gateId) => ({
      gateId,
      status: "pending" as const,
      dependencies: [],
    }));

    const chain: ApprovalChain = {
      runId,
      chainId,
      gates,
      status: "pending",
      createdAt: new Date(),
    };

    this.chains.set(chainId, chain);
    logger.info({ chainId, runId, gateCount: gates.length }, "Created approval chain");
    return chain;
  }

  /**
   * Evaluate a gate for auto-approval
   */
  async evaluateGateForApproval(runId: string, gateId: string): Promise<boolean> {
    const bundle = loadRunBundle(runId);
    if (!bundle) {
      logger.warn({ runId }, "Run bundle not found");
      return false;
    }

    // Check all rules for this gate
    const applicableRules = Array.from(this.rules.values()).filter(
      (rule) => rule.gateId === gateId && rule.enabled
    );

    if (applicableRules.length === 0) {
      logger.debug({ gateId }, "No applicable auto-approval rules");
      return false;
    }

    // Sort by priority (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      const conditionsMet = await this.evaluateConditions(bundle, rule);

      if (conditionsMet && (await this.checkDependencies(runId, rule.dependencies))) {
        logger.info(
          { ruleId: rule.id, runId, gateId },
          "Gate approved by auto-approval rule"
        );

        // Execute approval actions
        await this.executeApprovalActions(runId, gateId, rule);
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate if all conditions for a rule are met
   */
  private async evaluateConditions(bundle: any, rule: AutoApprovalRule): Promise<boolean> {
    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(bundle, condition);
      if (!result) {
        logger.debug(
          { condition: condition.type, ruleId: rule.id },
          "Condition not met"
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(bundle: any, condition: ApprovalCondition): Promise<boolean> {
    switch (condition.type) {
      case "test_pass":
        return this.checkTestPass(bundle, condition.value);
      case "coverage_threshold":
        return this.checkCoverageThreshold(bundle, condition.value);
      case "quality_score":
        return this.checkQualityScore(bundle, condition.operator, condition.value);
      case "timeout":
        return this.checkTimeout(bundle, condition.value);
      case "manual":
        return false; // Manual conditions always require manual approval
      default:
        return false;
    }
  }

  /**
   * Check if all dependencies are approved
   */
  private async checkDependencies(runId: string, dependencies: string[]): Promise<boolean> {
    if (dependencies.length === 0) {
      return true;
    }

    const bundle = loadRunBundle(runId);
    if (!bundle) {
      return false;
    }

    // Check if all dependency gates are approved in the run state
    const approvedGates = bundle.state.approvedGates || [];
    return dependencies.every((gateId) => approvedGates.includes(gateId));
  }

  /**
   * Check if tests have passed
   */
  private async checkTestPass(bundle: any, testNames?: string[]): Promise<boolean> {
    const testResults = bundle.state.testResults || {};

    if (!testNames || testNames.length === 0) {
      // All tests passed
      return Object.values(testResults).every((result: any) => result.status === "passed");
    }

    // Check specific tests
    return testNames.every((name) => testResults[name]?.status === "passed");
  }

  /**
   * Check if coverage meets threshold
   */
  private async checkCoverageThreshold(bundle: any, threshold: number): Promise<boolean> {
    const coverage = bundle.state.coverage?.percentage || 0;
    return coverage >= threshold;
  }

  /**
   * Check quality score
   */
  private async checkQualityScore(
    bundle: any,
    operator: string,
    threshold: number
  ): Promise<boolean> {
    const score = bundle.state.qualityScore || 0;

    switch (operator) {
      case "greater_than":
        return score > threshold;
      case "equals":
        return score === threshold;
      case "less_than":
        return score < threshold;
      default:
        return false;
    }
  }

  /**
   * Check if timeout has been exceeded
   */
  private async checkTimeout(bundle: any, maxMinutes: number): Promise<boolean> {
    const createdAt = new Date(bundle.state.createdAt);
    const elapsed = Date.now() - createdAt.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);
    return elapsedMinutes > maxMinutes;
  }

  /**
   * Execute approval actions
   */
  private async executeApprovalActions(
    runId: string,
    gateId: string,
    rule: AutoApprovalRule
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case "approve":
            await ApprovalService.approve(runId, `auto-approval:${rule.id}`);
            break;

          case "log":
            logger.info({ runId, gateId, ruleId: rule.id }, action.config?.message || "Gate auto-approved");
            break;

          case "escalate":
            // Could escalate to Slack, PagerDuty, etc.
            logger.warn(
              { channel: action.config?.channel || "#alerts", runId, gateId },
              `Gate auto-approved with escalation: ${rule.name}`
            );
            break;

          case "notify":
            logger.info(
              { recipients: action.config?.recipients, runId, gateId },
              `Notifying stakeholders of auto-approval`
            );
            break;
        }
      } catch (err: any) {
        logger.error(
          { err, action: action.type, ruleId: rule.id },
          "Failed to execute approval action"
        );
      }
    }
  }

  /**
   * Get all rules for a specific gate
   */
  getRulesForGate(gateId: string): AutoApprovalRule[] {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.gateId === gateId && rule.enabled
    );
  }

  /**
   * Get all registered rules
   */
  getAllRules(): AutoApprovalRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }

  /**
   * Get approval chain by ID
   */
  getApprovalChain(chainId: string): ApprovalChain | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Get approval chains for a run
   */
  getChainsForRun(runId: string): ApprovalChain[] {
    return Array.from(this.chains.values()).filter((chain) => chain.runId === runId);
  }
}

/**
 * Default auto-approval rules
 */
export const DEFAULT_AUTO_APPROVAL_RULES: AutoApprovalRule[] = [
  {
    id: "auto-approve-low-risk",
    name: "Auto-Approve Low-Risk Changes",
    description: "Automatically approve gates for low-risk changes with high coverage",
    gateId: "security",
    priority: 80,
    enabled: true,
    conditions: [
      { type: "test_pass", operator: "equals", value: true },
      { type: "coverage_threshold", operator: "greater_than", value: 85 },
      { type: "quality_score", operator: "greater_than", value: 90 },
    ],
    dependencies: [],
    actions: [
      {
        type: "approve",
        config: { reason: "Low-risk change with high quality metrics" },
      },
      {
        type: "log",
        config: { message: "Security gate auto-approved for low-risk change" },
      },
    ],
  },
  {
    id: "auto-approve-documentation",
    name: "Auto-Approve Documentation Changes",
    description: "Automatically approve documentation-only changes",
    gateId: "architecture",
    priority: 90,
    enabled: true,
    conditions: [
      { type: "manual", operator: "equals", value: null }, // Placeholder
    ],
    dependencies: [],
    actions: [
      {
        type: "approve",
        config: { reason: "Documentation-only change" },
      },
    ],
  },
];

// Singleton instance
let instance: AutoApprovalEngine | null = null;

export function getAutoApprovalEngine(): AutoApprovalEngine {
  if (!instance) {
    instance = new AutoApprovalEngine(DEFAULT_AUTO_APPROVAL_RULES);
  }
  return instance;
}
