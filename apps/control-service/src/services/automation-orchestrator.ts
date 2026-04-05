import { logger } from "../../../../packages/shared/src/logger";
import {
  getAutoApprovalEngine,
  AutoApprovalRule,
  ApprovalChain,
} from "./auto-approval-engine";
import {
  getAlertAcknowledgmentService,
  AutoAcknowledgmentRule,
} from "./alert-acknowledgment-service";
import { getTestVerificationService, TestVerificationRule } from "./test-verification-service";
import { getHealingEngine, HealingStrategy } from "./healing-engine";
import {
  getRollbackAutomationService,
  RollbackStrategy,
} from "./rollback-automation";

/**
 * Automation Configuration
 */
export interface AutomationConfig {
  enabled: boolean;
  mode: "safe" | "balanced" | "aggressive"; // Determines which automations run
  metrics?: {
    enableMetricsCollection: boolean;
    aggregationWindowSeconds: number;
  };
}

/**
 * Automation Status
 */
export interface AutomationStatus {
  enabled: boolean;
  mode: "safe" | "balanced" | "aggressive";
  services: {
    autoApproval: { enabled: boolean; rulesCount: number };
    alertAcknowledgment: { enabled: boolean; rulesCount: number };
    testVerification: { enabled: boolean; rulesCount: number };
    healing: { enabled: boolean; strategiesCount: number };
    rollback: { enabled: boolean; strategiesCount: number };
  };
  metrics: {
    autoApprovalsExecuted: number;
    alertsAutoAcknowledged: number;
    testVerificationsRun: number;
    healingStrategiesTriggered: number;
    rolbacksExecuted: number;
  };
}

/**
 * Automation Orchestrator
 * Central point for managing all automation services
 */
export class AutomationOrchestrator {
  private config: AutomationConfig;
  private metrics = {
    autoApprovalsExecuted: 0,
    alertsAutoAcknowledged: 0,
    testVerificationsRun: 0,
    healingStrategiesTriggered: 0,
    rolbacksExecuted: 0,
  };

  private autoApprovalEngine = getAutoApprovalEngine();
  private alertAckService = getAlertAcknowledgmentService();
  private testVerificationService = getTestVerificationService();
  private healingEngine = getHealingEngine();
  private rollbackService = getRollbackAutomationService();

  private automationLoopInterval?: NodeJS.Timeout;

  constructor(config: AutomationConfig = { enabled: true, mode: "balanced" }) {
    this.config = config;
    logger.info({ mode: config.mode }, "Automation orchestrator initialized");
  }

  /**
   * Start the automation loop
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info("Automation is disabled");
      return;
    }

    logger.info({ mode: this.config.mode }, "Starting automation orchestrator");

    // Run automation checks every 30 seconds (configurable)
    this.automationLoopInterval = setInterval(() => {
      this.runAutomationCycle();
    }, 30000);
  }

  /**
   * Stop the automation loop
   */
  stop(): void {
    if (this.automationLoopInterval) {
      clearInterval(this.automationLoopInterval);
      this.automationLoopInterval = undefined;
      logger.info("Automation orchestrator stopped");
    }
  }

  /**
   * Run a single automation cycle
   */
  private async runAutomationCycle(): Promise<void> {
    try {
      logger.debug("Running automation cycle");

      // Get current metrics (in production, would come from monitoring system)
      const metrics = this.getMetrics();

      // Run automations based on mode
      switch (this.config.mode) {
        case "safe":
          await this.runSafeAutomations(metrics);
          break;
        case "balanced":
          await this.runBalancedAutomations(metrics);
          break;
        case "aggressive":
          await this.runAggressiveAutomations(metrics);
          break;
      }
    } catch (err: any) {
      logger.error({ err }, "Error during automation cycle");
    }
  }

  /**
   * Safe mode: Only test verification and alerting
   */
  private async runSafeAutomations(metrics: Record<string, number>): Promise<void> {
    logger.debug("Running safe mode automations");

    // Test verification (safe, just provides data)
    // Alert acknowledgment (safe, just closes alerts)
    // NO auto-approvals or rollbacks

    // Evaluate alerts for auto-acknowledgment
    const alertsAcked = await this.evaluateAlertAcknowledgments(metrics);
    this.metrics.alertsAutoAcknowledged += alertsAcked;
  }

  /**
   * Balanced mode: Automations + test verification + auto-approval
   */
  private async runBalancedAutomations(metrics: Record<string, number>): Promise<void> {
    logger.debug("Running balanced mode automations");

    // Safe automations
    const alertsAcked = await this.evaluateAlertAcknowledgments(metrics);
    this.metrics.alertsAutoAcknowledged += alertsAcked;

    // Healing strategies (moderate risk)
    const healingsTriggered = await this.evaluateHealingStrategies(metrics);
    this.metrics.healingStrategiesTriggered += healingsTriggered;

    // NO auto-approvals or rollbacks in balanced mode
  }

  /**
   * Aggressive mode: All automations enabled
   */
  private async runAggressiveAutomations(metrics: Record<string, number>): Promise<void> {
    logger.debug("Running aggressive mode automations");

    // All automations enabled
    const alertsAcked = await this.evaluateAlertAcknowledgments(metrics);
    this.metrics.alertsAutoAcknowledged += alertsAcked;

    const healingsTriggered = await this.evaluateHealingStrategies(metrics);
    this.metrics.healingStrategiesTriggered += healingsTriggered;

    const rollbacksTriggered = await this.evaluateRollbackStrategies(metrics);
    this.metrics.rolbacksExecuted += rollbacksTriggered;
  }

  /**
   * Evaluate alert acknowledgments
   */
  private async evaluateAlertAcknowledgments(metrics: Record<string, number>): Promise<number> {
    let count = 0;
    const rules = this.alertAckService.getAllRules();

    for (const rule of rules) {
      try {
        const pending = this.alertAckService.getPendingAlerts();
        for (const alert of pending) {
          const acknowledged = await this.alertAckService.evaluateAlertForAcknowledgment(
            rule.alertRuleId,
            alert.alertId,
            metrics
          );
          if (acknowledged) {
            count++;
          }
        }
      } catch (err: any) {
        logger.error({ err, ruleId: rule.id }, "Error evaluating alert acknowledgment");
      }
    }

    return count;
  }

  /**
   * Evaluate healing strategies
   */
  private async evaluateHealingStrategies(metrics: Record<string, number>): Promise<number> {
    let count = 0;

    try {
      const executions = await this.healingEngine.evaluateAndHeal(metrics);
      count = executions.filter((e) => e.status === "success").length;
    } catch (err: any) {
      logger.error({ err }, "Error evaluating healing strategies");
    }

    return count;
  }

  /**
   * Evaluate rollback strategies
   */
  private async evaluateRollbackStrategies(metrics: Record<string, number>): Promise<number> {
    let count = 0;

    try {
      const { shouldRollback, strategy, trigger } = await this.rollbackService.shouldRollback(
        metrics
      );

      if (shouldRollback && strategy && trigger) {
        const execution = await this.rollbackService.executeRollback(
          strategy,
          "default-deployment", // In production, would get actual deployment ID
          metrics,
          trigger,
          "Auto-triggered rollback"
        );

        if (execution.status === "success") {
          count = 1;
        }
      }
    } catch (err: any) {
      logger.error({ err }, "Error evaluating rollback strategies");
    }

    return count;
  }

  /**
   * Get current metrics (stub - would integrate with monitoring)
   */
  private getMetrics(): Record<string, number> {
    // In production, would fetch from Prometheus, DataDog, etc.
    return {
      error_rate: 1.2, // 1.2%
      cpu_usage: 45,
      memory_usage: 62,
      p99_latency: 250,
      http_5xx_errors_per_minute: 2,
      auth_failures_per_minute: 1,
      db_pool_available_connections: 8,
      redis_connected: 1,
    };
  }

  /**
   * Register auto-approval rule
   */
  registerAutoApprovalRule(rule: AutoApprovalRule): void {
    this.autoApprovalEngine.registerRule(rule);
  }

  /**
   * Register alert acknowledgment rule
   */
  registerAlertAcknowledgmentRule(rule: AutoAcknowledgmentRule): void {
    this.alertAckService.registerRule(rule);
  }

  /**
   * Register test verification rule
   */
  registerTestVerificationRule(rule: TestVerificationRule): void {
    this.testVerificationService.registerRule(rule);
  }

  /**
   * Register healing strategy
   */
  registerHealingStrategy(strategy: HealingStrategy): void {
    this.healingEngine.registerStrategy(strategy);
  }

  /**
   * Register rollback strategy
   */
  registerRollbackStrategy(strategy: RollbackStrategy): void {
    this.rollbackService.registerStrategy(strategy);
  }

  /**
   * Get automation status
   */
  getStatus(): AutomationStatus {
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      services: {
        autoApproval: {
          enabled: this.config.enabled,
          rulesCount: this.autoApprovalEngine.getAllRules().length,
        },
        alertAcknowledgment: {
          enabled: this.config.enabled,
          rulesCount: this.alertAckService.getAllRules().length,
        },
        testVerification: {
          enabled: this.config.enabled,
          rulesCount: this.testVerificationService.getAllRules().length,
        },
        healing: {
          enabled: this.config.enabled,
          strategiesCount: this.healingEngine.getAllStrategies().length,
        },
        rollback: {
          enabled: this.config.enabled,
          strategiesCount: this.rollbackService.getAllStrategies().length,
        },
      },
      metrics: { ...this.metrics },
    };
  }

  /**
   * Set automation mode
   */
  setMode(mode: "safe" | "balanced" | "aggressive"): void {
    this.config.mode = mode;
    logger.info({ mode }, "Automation mode changed");
  }

  /**
   * Enable/disable automation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Get auto-approval engine
   */
  getAutoApprovalEngine() {
    return this.autoApprovalEngine;
  }

  /**
   * Get alert acknowledgment service
   */
  getAlertAcknowledgmentService() {
    return this.alertAckService;
  }

  /**
   * Get test verification service
   */
  getTestVerificationService() {
    return this.testVerificationService;
  }

  /**
   * Get healing engine
   */
  getHealingEngine() {
    return this.healingEngine;
  }

  /**
   * Get rollback service
   */
  getRollbackService() {
    return this.rollbackService;
  }
}

// Singleton instance
let instance: AutomationOrchestrator | null = null;

export function getAutomationOrchestrator(): AutomationOrchestrator {
  if (!instance) {
    instance = new AutomationOrchestrator({ enabled: true, mode: "balanced" });
    instance.start();
  }
  return instance;
}
