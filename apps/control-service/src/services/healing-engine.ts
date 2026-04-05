import { logger } from "../../../../packages/shared/src/logger";

/**
 * Healing Strategy - Automated remediation action
 */
export interface HealingStrategy {
  id: string;
  name: string;
  description: string;
  priority: number; // 0-100, higher = try first
  enabled: boolean;
  condition: HealingCondition;
  actions: RemediationAction[];
  rollbackOn: string[]; // Conditions that trigger rollback
  maxAttempts: number;
  timeout: number; // seconds
}

export interface HealingCondition {
  type: "error_rate" | "latency" | "resource_usage" | "service_degradation" | "manual";
  metric: string;
  operator: "greater_than" | "less_than" | "equals";
  threshold: number;
  duration: number; // seconds - how long condition must persist
}

export interface RemediationAction {
  type: "restart_service" | "scale_up" | "clear_cache" | "rebalance_load" | "circuit_breaker" | "custom";
  priority: number;
  params?: Record<string, any>;
  timeout?: number;
}

/**
 * Healing Execution - Records a healing attempt
 */
export interface HealingExecution {
  id: string;
  strategyId: string;
  triggeredAt: Date;
  completedAt?: Date;
  status: "pending" | "in_progress" | "success" | "failed" | "rolled_back";
  trigger: HealingCondition;
  actionsPerformed: {
    action: RemediationAction;
    startedAt: Date;
    completedAt?: Date;
    status: "pending" | "success" | "failed";
    result?: any;
  }[];
  rolledBack: boolean;
  error?: string;
  metrics?: {
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
  };
}

/**
 * Healing Engine
 * Automatically selects and executes remediation strategies
 */
export class HealingEngine {
  private strategies: Map<string, HealingStrategy> = new Map();
  private executions: Map<string, HealingExecution> = new Map();
  private conditionTracker: Map<string, Date> = new Map(); // Track when conditions started

  constructor(strategies: HealingStrategy[] = []) {
    strategies.forEach((strategy) => this.strategies.set(strategy.id, strategy));
  }

  /**
   * Register a healing strategy
   */
  registerStrategy(strategy: HealingStrategy): void {
    if (!strategy.enabled) {
      logger.info({ strategyId: strategy.id }, "Healing strategy disabled");
      return;
    }
    this.strategies.set(strategy.id, strategy);
    logger.info(
      { strategyId: strategy.id, name: strategy.name },
      "Registered healing strategy"
    );
  }

  /**
   * Evaluate conditions and auto-heal if necessary
   */
  async evaluateAndHeal(metrics: Record<string, number>): Promise<HealingExecution[]> {
    const executions: HealingExecution[] = [];

    // Find applicable strategies (sorted by priority)
    const applicableStrategies = this.findApplicableStrategies(metrics).sort(
      (a, b) => b.priority - a.priority
    );

    for (const strategy of applicableStrategies) {
      const execution = await this.executeStrategy(strategy, metrics);
      executions.push(execution);

      // If execution succeeded, don't try lower priority strategies
      if (execution.status === "success") {
        logger.info(
          { strategyId: strategy.id, executionId: execution.id },
          "Healing succeeded, stopping strategy evaluation"
        );
        break;
      }
    }

    return executions;
  }

  /**
   * Find strategies applicable to current metrics
   */
  private findApplicableStrategies(metrics: Record<string, number>): HealingStrategy[] {
    return Array.from(this.strategies.values()).filter((strategy) => {
      if (!strategy.enabled) {
        return false;
      }

      const metricValue = metrics[strategy.condition.metric] || 0;
      const conditionMet = this.evaluateCondition(metricValue, strategy.condition);

      if (conditionMet) {
        // Check if condition has persisted long enough
        const conditionKey = `${strategy.id}-${strategy.condition.metric}`;
        const conditionStart = this.conditionTracker.get(conditionKey);

        if (!conditionStart) {
          // Condition just started
          this.conditionTracker.set(conditionKey, new Date());
          return false;
        }

        const elapsed = (Date.now() - conditionStart.getTime()) / 1000;
        return elapsed >= strategy.condition.duration;
      } else {
        // Condition resolved, clean up tracker
        const conditionKey = `${strategy.id}-${strategy.condition.metric}`;
        this.conditionTracker.delete(conditionKey);
      }

      return false;
    });
  }

  /**
   * Evaluate if condition is met
   */
  private evaluateCondition(value: number, condition: HealingCondition): boolean {
    switch (condition.operator) {
      case "greater_than":
        return value > condition.threshold;
      case "less_than":
        return value < condition.threshold;
      case "equals":
        return value === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Execute a healing strategy
   */
  private async executeStrategy(
    strategy: HealingStrategy,
    metrics: Record<string, number>
  ): Promise<HealingExecution> {
    const execution: HealingExecution = {
      id: `heal-${strategy.id}-${Date.now()}`,
      strategyId: strategy.id,
      triggeredAt: new Date(),
      status: "pending",
      trigger: strategy.condition,
      actionsPerformed: [],
      rolledBack: false,
      metrics: {
        beforeMetrics: { ...metrics },
        afterMetrics: {},
      },
    };

    try {
      execution.status = "in_progress";
      logger.info(
        { executionId: execution.id, strategyId: strategy.id },
        "Starting healing strategy execution"
      );

      // Execute actions in sequence
      for (const action of strategy.actions) {
        const actionExecution = {
          action,
          startedAt: new Date(),
          status: "pending" as const,
        };

        try {
          const result = await this.executeAction(action);
          actionExecution.status = "success";
          actionExecution.completedAt = new Date();
          (actionExecution as any).result = result;

          logger.info(
            { executionId: execution.id, actionType: action.type },
            "Action executed successfully"
          );
        } catch (err: any) {
          actionExecution.status = "failed";
          actionExecution.completedAt = new Date();

          logger.error(
            { err, executionId: execution.id, actionType: action.type },
            "Action execution failed"
          );

          // Rollback if this is a critical action
          if (action.priority >= 80) {
            await this.rollback(execution, strategy);
            execution.rolledBack = true;
            execution.status = "rolled_back";
            execution.completedAt = new Date();
            this.executions.set(execution.id, execution);
            return execution;
          }
        }

        execution.actionsPerformed.push(actionExecution);
      }

      execution.status = "success";
      execution.completedAt = new Date();
      logger.info({ executionId: execution.id }, "Healing strategy completed successfully");
    } catch (err: any) {
      execution.status = "failed";
      execution.error = err.message;
      execution.completedAt = new Date();
      logger.error(
        { err, executionId: execution.id, strategyId: strategy.id },
        "Healing strategy execution failed"
      );
    }

    this.executions.set(execution.id, execution);
    return execution;
  }

  /**
   * Execute a remediation action
   */
  private async executeAction(action: RemediationAction): Promise<any> {
    const timeout = action.timeout || 30000; // 30s default

    return Promise.race([
      this.performAction(action),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Action timeout")), timeout)
      ),
    ]);
  }

  /**
   * Perform the actual remediation action
   */
  private async performAction(action: RemediationAction): Promise<any> {
    switch (action.type) {
      case "restart_service":
        logger.info(
          { service: action.params?.service },
          "Restarting service for healing"
        );
        // Simulate restart
        await this.delay(500);
        return { restarted: true, service: action.params?.service };

      case "scale_up":
        logger.info(
          { replicas: action.params?.replicas },
          "Scaling up service for healing"
        );
        // Simulate scale-up
        await this.delay(1000);
        return { scaled: true, replicas: action.params?.replicas };

      case "clear_cache":
        logger.info("Clearing cache for healing");
        // Simulate cache clear
        await this.delay(300);
        return { cleared: true, items: 1024 };

      case "rebalance_load":
        logger.info("Rebalancing load distribution for healing");
        // Simulate rebalancing
        await this.delay(800);
        return { rebalanced: true, nodes: 5 };

      case "circuit_breaker":
        logger.info(
          { duration: action.params?.duration },
          "Activating circuit breaker for healing"
        );
        // Simulate circuit breaker
        await this.delay(200);
        return { active: true, duration: action.params?.duration };

      case "custom":
        logger.info({ script: action.params?.script }, "Running custom healing action");
        // Execute custom script/webhook
        await this.delay(1000);
        return { executed: true, script: action.params?.script };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Rollback healing actions
   */
  private async rollback(execution: HealingExecution, strategy: HealingStrategy): Promise<void> {
    logger.warn(
      { executionId: execution.id, strategyId: strategy.id },
      "Rolling back healing strategy"
    );

    // Reverse actions in opposite order
    for (let i = execution.actionsPerformed.length - 1; i >= 0; i--) {
      const actionExecution = execution.actionsPerformed[i];
      if (actionExecution.status === "success") {
        try {
          // In production, would actually reverse the action
          await this.reverseAction(actionExecution.action);
        } catch (err: any) {
          logger.error({ err, action: actionExecution.action.type }, "Failed to reverse action");
        }
      }
    }
  }

  /**
   * Reverse an action (undo)
   */
  private async reverseAction(action: RemediationAction): Promise<void> {
    logger.info({ actionType: action.type }, "Reversing action");
    await this.delay(300);
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get healing execution by ID
   */
  getExecution(executionId: string): HealingExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get recent executions
   */
  getRecentExecutions(limit: number = 10): HealingExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get execution success rate
   */
  getSuccessRate(): number {
    const executions = Array.from(this.executions.values());
    if (executions.length === 0) return 0;

    const successful = executions.filter((e) => e.status === "success").length;
    return (successful / executions.length) * 100;
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): HealingStrategy[] {
    return Array.from(this.strategies.values()).filter((s) => s.enabled);
  }
}

/**
 * Default healing strategies
 */
export const DEFAULT_HEALING_STRATEGIES: HealingStrategy[] = [
  {
    id: "heal-high-cpu",
    name: "High CPU Usage Healing",
    description: "Scale up services when CPU exceeds 85%",
    priority: 85,
    enabled: true,
    condition: {
      type: "resource_usage",
      metric: "cpu_usage",
      operator: "greater_than",
      threshold: 85,
      duration: 30, // 30 seconds of high CPU
    },
    actions: [
      {
        type: "scale_up",
        priority: 90,
        params: { replicas: 3 },
        timeout: 60,
      },
      {
        type: "rebalance_load",
        priority: 80,
        timeout: 30,
      },
    ],
    rollbackOn: ["cpu_usage < 50"],
    maxAttempts: 3,
    timeout: 120,
  },
  {
    id: "heal-high-error-rate",
    name: "High Error Rate Healing",
    description: "Clear cache and activate circuit breaker on high error rate",
    priority: 90,
    enabled: true,
    condition: {
      type: "error_rate",
      metric: "error_rate",
      operator: "greater_than",
      threshold: 10,
      duration: 20, // 20 seconds of high error rate
    },
    actions: [
      {
        type: "clear_cache",
        priority: 85,
        timeout: 30,
      },
      {
        type: "circuit_breaker",
        priority: 95,
        params: { duration: 30 },
        timeout: 10,
      },
    ],
    rollbackOn: ["error_rate < 2"],
    maxAttempts: 2,
    timeout: 90,
  },
  {
    id: "heal-high-latency",
    name: "High Latency Healing",
    description: "Scale up and rebalance when latency exceeds threshold",
    priority: 80,
    enabled: true,
    condition: {
      type: "latency",
      metric: "p99_latency",
      operator: "greater_than",
      threshold: 5000, // 5 seconds
      duration: 60,
    },
    actions: [
      {
        type: "scale_up",
        priority: 85,
        params: { replicas: 2 },
        timeout: 60,
      },
      {
        type: "rebalance_load",
        priority: 75,
        timeout: 30,
      },
    ],
    rollbackOn: ["p99_latency < 1000"],
    maxAttempts: 3,
    timeout: 150,
  },
];

// Singleton instance
let instance: HealingEngine | null = null;

export function getHealingEngine(): HealingEngine {
  if (!instance) {
    instance = new HealingEngine(DEFAULT_HEALING_STRATEGIES);
  }
  return instance;
}
