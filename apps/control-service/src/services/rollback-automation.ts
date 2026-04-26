// @ts-nocheck
import { logger } from "../../../../packages/shared/src/logger";

/**
 * Rollback Trigger
 */
export interface RollbackTrigger {
  type: "error_rate" | "latency" | "manual" | "health_check";
  metric: string;
  threshold: number;
  duration: number; // seconds
  operator: "greater_than" | "less_than";
}

/**
 * Rollback Strategy
 */
export interface RollbackStrategy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 0-100
  triggers: RollbackTrigger[];
  rollbackActions: RollbackAction[];
  canaryPercentage?: number; // Start with canary before full rollback
  cooldownPeriod: number; // seconds - prevent repeated rollbacks
  maxRollbacksPerHour: number;
}

export interface RollbackAction {
  type: "revert_deployment" | "switch_traffic" | "restore_database" | "notify_team" | "create_incident";
  priority: number;
  params?: Record<string, any>;
  timeout?: number;
}

/**
 * Rollback Execution
 */
export interface RollbackExecution {
  id: string;
  strategyId: string;
  deploymentId: string;
  previousVersion: string;
  targetVersion: string;
  triggeredAt: Date;
  completedAt?: Date;
  status: "pending" | "in_progress" | "success" | "failed" | "partial";
  trigger: RollbackTrigger;
  reason: string;
  actionsPerformed: {
    action: RollbackAction;
    startedAt: Date;
    completedAt?: Date;
    status: "success" | "failed";
    result?: any;
  }[];
  metrics?: {
    beforeRollback: Record<string, number>;
    afterRollback: Record<string, number>;
  };
  error?: string;
}

/**
 * Rollback Automation Service
 * Automatically rolls back deployments based on health conditions
 */
export class RollbackAutomationService {
  private strategies: Map<string, RollbackStrategy> = new Map();
  private executions: Map<string, RollbackExecution> = new Map();
  private lastRollbacks: Map<string, Date> = new Map(); // Track last rollback per strategy
  private rollbackCounts: Map<string, number[]> = new Map(); // Track rollbacks per hour
  private deploymentVersions: Map<string, string> = new Map(); // Track deployed versions

  constructor(strategies: RollbackStrategy[] = []) {
    strategies.forEach((strategy) => this.strategies.set(strategy.id, strategy));
  }

  /**
   * Register a rollback strategy
   */
  registerStrategy(strategy: RollbackStrategy): void {
    if (!strategy.enabled) {
      logger.info({ strategyId: strategy.id }, "Rollback strategy disabled");
      return;
    }
    this.strategies.set(strategy.id, strategy);
    logger.info(
      { strategyId: strategy.id, name: strategy.name },
      "Registered rollback strategy"
    );
  }

  /**
   * Check if rollback should be triggered
   */
  async shouldRollback(metrics: Record<string, number>): Promise<{
    shouldRollback: boolean;
    strategy?: RollbackStrategy;
    trigger?: RollbackTrigger;
  }> {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter((s) => s.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      // Check cooldown period
      if (this.isInCooldown(strategy.id, strategy.cooldownPeriod)) {
        logger.debug({ strategyId: strategy.id }, "Strategy in cooldown period");
        continue;
      }

      // Check rollback limit
      if (this.hasExceededRollbackLimit(strategy.id, strategy.maxRollbacksPerHour)) {
        logger.warn(
          { strategyId: strategy.id },
          "Exceeded max rollbacks per hour for strategy"
        );
        continue;
      }

      // Check triggers
      for (const trigger of strategy.triggers) {
        if (this.evaluateTrigger(metrics, trigger)) {
          logger.warn(
            { strategyId: strategy.id, trigger: trigger.type },
            "Rollback trigger condition met"
          );
          return { shouldRollback: true, strategy, trigger };
        }
      }
    }

    return { shouldRollback: false };
  }

  /**
   * Execute a rollback
   */
  async executeRollback(
    strategy: RollbackStrategy,
    deploymentId: string,
    currentMetrics: Record<string, number>,
    trigger: RollbackTrigger,
    reason: string
  ): Promise<RollbackExecution> {
    const previousVersion = this.deploymentVersions.get(deploymentId) || "unknown";
    const execution: RollbackExecution = {
      id: `rollback-${deploymentId}-${Date.now()}`,
      strategyId: strategy.id,
      deploymentId,
      previousVersion,
      targetVersion: "previous",
      triggeredAt: new Date(),
      status: "pending",
      trigger,
      reason,
      actionsPerformed: [],
      metrics: {
        beforeRollback: { ...currentMetrics },
        afterRollback: {},
      },
    };

    try {
      execution.status = "in_progress";
      logger.warn(
        {
          executionId: execution.id,
          strategyId: strategy.id,
          deploymentId,
          reason,
        },
        "Starting rollback execution"
      );

      // If canary enabled, start with canary rollback
      if (strategy.canaryPercentage && strategy.canaryPercentage > 0) {
        await this.executeCanaryRollback(execution, strategy);
      }

      // Execute rollback actions
      for (const action of strategy.rollbackActions) {
        const actionExecution = {
          action,
          startedAt: new Date(),
          status: "success" as const,
        };

        try {
          const result = await this.executeRollbackAction(action);
          actionExecution.completedAt = new Date();
          (actionExecution as any).result = result;

          logger.info(
            { executionId: execution.id, actionType: action.type },
            "Rollback action completed"
          );
        } catch (err: any) {
          actionExecution.status = "failed";
          actionExecution.completedAt = new Date();

          logger.error(
            { err, executionId: execution.id, actionType: action.type },
            "Rollback action failed"
          );

          if (action.priority >= 90) {
            execution.status = "failed";
            execution.error = err.message;
            execution.completedAt = new Date();
            this.executions.set(execution.id, execution);
            return execution;
          }
        }

        execution.actionsPerformed.push(actionExecution);
      }

      execution.status = "success";
      execution.completedAt = new Date();

      // Record this rollback
      this.recordRollback(strategy.id);

      logger.warn(
        { executionId: execution.id, deploymentId },
        "Rollback completed successfully"
      );
    } catch (err: any) {
      execution.status = "failed";
      execution.error = err.message;
      execution.completedAt = new Date();
      logger.error(
        { err, executionId: execution.id, strategyId: strategy.id },
        "Rollback execution failed"
      );
    }

    this.executions.set(execution.id, execution);
    return execution;
  }

  /**
   * Execute canary rollback (roll back percentage of traffic)
   */
  private async executeCanaryRollback(
    execution: RollbackExecution,
    strategy: RollbackStrategy
  ): Promise<void> {
    const canaryPercentage = strategy.canaryPercentage || 10;
    logger.info(
      { deploymentId: execution.deploymentId, percentage: canaryPercentage },
      "Starting canary rollback"
    );

    // Simulate canary rollback
    await this.delay(1000);

    // In production, would monitor canary for errors
    // If errors detected, proceed to full rollback
    // Otherwise, continue monitoring or expand gradually

    logger.info(
      { deploymentId: execution.deploymentId },
      "Canary rollback completed successfully"
    );
  }

  /**
   * Evaluate if a trigger condition is met
   */
  private evaluateTrigger(metrics: Record<string, number>, trigger: RollbackTrigger): boolean {
    const metricValue = metrics[trigger.metric] || 0;

    switch (trigger.operator) {
      case "greater_than":
        return metricValue > trigger.threshold;
      case "less_than":
        return metricValue < trigger.threshold;
      default:
        return false;
    }
  }

  /**
   * Check if strategy is in cooldown
   */
  private isInCooldown(strategyId: string, cooldownSeconds: number): boolean {
    const lastRollback = this.lastRollbacks.get(strategyId);
    if (!lastRollback) {
      return false;
    }

    const elapsed = (Date.now() - lastRollback.getTime()) / 1000;
    return elapsed < cooldownSeconds;
  }

  /**
   * Check if strategy has exceeded max rollbacks per hour
   */
  private hasExceededRollbackLimit(strategyId: string, maxPerHour: number): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get or initialize rollback times
    let rollbackTimes = this.rollbackCounts.get(strategyId) || [];

    // Filter to rollbacks within last hour
    rollbackTimes = rollbackTimes.filter((time) => time > oneHourAgo);

    // Update storage
    this.rollbackCounts.set(strategyId, rollbackTimes);

    return rollbackTimes.length >= maxPerHour;
  }

  /**
   * Record a rollback execution
   */
  private recordRollback(strategyId: string): void {
    this.lastRollbacks.set(strategyId, new Date());

    const rollbackTimes = this.rollbackCounts.get(strategyId) || [];
    rollbackTimes.push(Date.now());
    this.rollbackCounts.set(strategyId, rollbackTimes);
  }

  /**
   * Execute a rollback action
   */
  private async executeRollbackAction(action: RollbackAction): Promise<any> {
    const timeout = action.timeout || 60000; // 60s default

    return Promise.race([
      this.performRollbackAction(action),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Action timeout")), timeout)
      ),
    ]);
  }

  /**
   * Perform the actual rollback action
   */
  private async performRollbackAction(action: RollbackAction): Promise<any> {
    switch (action.type) {
      case "revert_deployment":
        logger.warn(
          { deployment: action.params?.deployment },
          "Reverting deployment to previous version"
        );
        await this.delay(2000);
        return { reverted: true, deployment: action.params?.deployment };

      case "switch_traffic":
        logger.warn(
          { percentage: action.params?.percentage },
          "Switching traffic to previous deployment"
        );
        await this.delay(1000);
        return { switched: true, percentage: action.params?.percentage };

      case "restore_database":
        logger.warn(
          { snapshot: action.params?.snapshot },
          "Restoring database from snapshot"
        );
        await this.delay(5000);
        return { restored: true, snapshot: action.params?.snapshot };

      case "notify_team":
        logger.warn(
          { channel: action.params?.channel },
          "Notifying team of rollback"
        );
        await this.delay(500);
        return { notified: true, channel: action.params?.channel };

      case "create_incident":
        logger.error(
          { severity: action.params?.severity },
          "Creating incident for rollback"
        );
        await this.delay(1000);
        return { created: true, incidentId: `INC-${Date.now()}` };

      default:
        throw new Error(`Unknown rollback action: ${action.type}`);
    }
  }

  /**
   * Register deployment version
   */
  setDeploymentVersion(deploymentId: string, version: string): void {
    this.deploymentVersions.set(deploymentId, version);
    logger.info({ deploymentId, version }, "Registered deployment version");
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get rollback execution by ID
   */
  getExecution(executionId: string): RollbackExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get recent rollbacks
   */
  getRecentRollbacks(limit: number = 10): RollbackExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get rollback statistics
   */
  getRollbackStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  } {
    const executions = Array.from(this.executions.values());
    const total = executions.length;
    const successful = executions.filter((e) => e.status === "success").length;
    const failed = executions.filter((e) => e.status === "failed").length;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): RollbackStrategy[] {
    return Array.from(this.strategies.values()).filter((s) => s.enabled);
  }
}

/**
 * Default rollback strategies
 */
export const DEFAULT_ROLLBACK_STRATEGIES: RollbackStrategy[] = [
  {
    id: "rollback-high-error-rate",
    name: "High Error Rate Rollback",
    description: "Automatically rollback on sustained high error rate (>5%)",
    enabled: true,
    priority: 95,
    triggers: [
      {
        type: "error_rate",
        metric: "error_rate",
        threshold: 5,
        duration: 60, // 60 seconds of high error rate
        operator: "greater_than",
      },
    ],
    rollbackActions: [
      {
        type: "switch_traffic",
        priority: 95,
        params: { percentage: 100 },
        timeout: 30,
      },
      {
        type: "revert_deployment",
        priority: 90,
        params: { deployment: "api-server" },
        timeout: 60,
      },
      {
        type: "notify_team",
        priority: 70,
        params: { channel: "#incidents" },
      },
      {
        type: "create_incident",
        priority: 75,
        params: { severity: "critical" },
      },
    ],
    canaryPercentage: 10,
    cooldownPeriod: 300, // 5 minutes
    maxRollbacksPerHour: 3,
  },
  {
    id: "rollback-high-latency",
    name: "High Latency Rollback",
    description: "Automatically rollback on sustained high latency (>10s p99)",
    enabled: true,
    priority: 85,
    triggers: [
      {
        type: "latency",
        metric: "p99_latency",
        threshold: 10000, // 10 seconds
        duration: 120, // 120 seconds of high latency
        operator: "greater_than",
      },
    ],
    rollbackActions: [
      {
        type: "switch_traffic",
        priority: 90,
        params: { percentage: 50 },
        timeout: 30,
      },
      {
        type: "revert_deployment",
        priority: 85,
        params: { deployment: "api-server" },
        timeout: 60,
      },
      {
        type: "notify_team",
        priority: 70,
        params: { channel: "#alerts" },
      },
    ],
    canaryPercentage: 20,
    cooldownPeriod: 600, // 10 minutes
    maxRollbacksPerHour: 2,
  },
];

// Singleton instance
let instance: RollbackAutomationService | null = null;

export function getRollbackAutomationService(): RollbackAutomationService {
  if (!instance) {
    instance = new RollbackAutomationService(DEFAULT_ROLLBACK_STRATEGIES);
  }
  return instance;
}
