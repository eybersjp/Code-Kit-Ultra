import { logger } from "../../../../packages/shared/src/logger";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder";

/**
 * Alert Acknowledgment - Records that an alert was acknowledged
 */
export interface AlertAcknowledgment {
  id: string;
  alertId: string;
  ruleId: string;
  acknowledgedAt: Date;
  acknowledgedBy: string; // "system" for auto-acknowledgments
  reason: string;
  resolutionMethod: "auto" | "manual";
  metadata?: Record<string, any>;
}

/**
 * Auto-Acknowledgment Rule
 * Automatically acknowledges alerts when conditions are resolved
 */
export interface AutoAcknowledgmentRule {
  id: string;
  name: string;
  description: string;
  alertRuleId: string; // The alert rule ID this acknowledgment rule applies to
  enabled: boolean;
  resolutionConditions: ResolutionCondition[];
  maxWaitTimeMinutes?: number; // Max time to wait before requiring manual ack
  actions: AcknowledgmentAction[];
}

export interface ResolutionCondition {
  type: "metric_below_threshold" | "error_rate_recovered" | "service_healthy" | "time_elapsed";
  metric?: string;
  threshold?: number;
  operator?: "less_than" | "greater_than" | "equals";
  waitMinutes?: number;
}

export interface AcknowledgmentAction {
  type: "acknowledge" | "log" | "notify" | "auto_remediate";
  config?: Record<string, any>;
}

/**
 * Alert Acknowledgment Service
 * Handles automatic and manual acknowledgment of alerts
 */
export class AlertAcknowledgmentService {
  private rules: Map<string, AutoAcknowledgmentRule> = new Map();
  private acknowledgments: Map<string, AlertAcknowledgment> = new Map();
  private pendingAlerts: Map<string, Date> = new Map(); // Track when alerts were triggered

  constructor(rules: AutoAcknowledgmentRule[] = []) {
    rules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  /**
   * Register an auto-acknowledgment rule
   */
  registerRule(rule: AutoAcknowledgmentRule): void {
    if (!rule.enabled) {
      logger.info({ ruleId: rule.id }, "Auto-ack rule disabled, not registering");
      return;
    }
    this.rules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name }, "Registered auto-acknowledgment rule");
  }

  /**
   * Record a new alert for tracking
   */
  recordAlert(alertRuleId: string, alertId: string): void {
    this.pendingAlerts.set(alertId, new Date());
    logger.info({ alertId, alertRuleId }, "Recorded alert for auto-acknowledgment tracking");
  }

  /**
   * Evaluate if an alert can be auto-acknowledged
   */
  async evaluateAlertForAcknowledgment(
    alertRuleId: string,
    alertId: string,
    currentMetrics: Record<string, number>
  ): Promise<boolean> {
    // Find applicable rules
    const applicableRules = Array.from(this.rules.values()).filter(
      (rule) => rule.alertRuleId === alertRuleId && rule.enabled
    );

    if (applicableRules.length === 0) {
      logger.debug({ alertRuleId }, "No applicable auto-acknowledgment rules");
      return false;
    }

    for (const rule of applicableRules) {
      const conditionsMet = await this.evaluateResolutionConditions(
        rule,
        alertId,
        currentMetrics
      );

      if (conditionsMet) {
        logger.info(
          { ruleId: rule.id, alertId, alertRuleId },
          "Alert auto-acknowledged due to condition resolution"
        );
        await this.acknowledgeAlert(alertId, alertRuleId, rule);
        return true;
      }
    }

    // Check if we've exceeded max wait time
    if (this.checkMaxWaitTime(alertId)) {
      logger.warn({ alertId, alertRuleId }, "Alert exceeded max wait time, manual ack required");
      return false;
    }

    return false;
  }

  /**
   * Evaluate if resolution conditions are met
   */
  private async evaluateResolutionConditions(
    rule: AutoAcknowledgmentRule,
    alertId: string,
    metrics: Record<string, number>
  ): Promise<boolean> {
    for (const condition of rule.resolutionConditions) {
      const result = await this.evaluateCondition(condition, metrics, alertId);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single resolution condition
   */
  private async evaluateCondition(
    condition: ResolutionCondition,
    metrics: Record<string, number>,
    alertId: string
  ): Promise<boolean> {
    switch (condition.type) {
      case "metric_below_threshold":
        return this.checkMetricBelowThreshold(
          metrics,
          condition.metric || "",
          condition.threshold || 0
        );

      case "error_rate_recovered":
        return this.checkErrorRateRecovered(metrics);

      case "service_healthy":
        return this.checkServiceHealth(metrics);

      case "time_elapsed":
        return this.checkTimeElapsed(alertId, condition.waitMinutes || 5);

      default:
        return false;
    }
  }

  /**
   * Check if metric is below threshold
   */
  private checkMetricBelowThreshold(
    metrics: Record<string, number>,
    metricName: string,
    threshold: number
  ): boolean {
    const value = metrics[metricName] || 0;
    return value < threshold;
  }

  /**
   * Check if error rate has recovered (below 1%)
   */
  private checkErrorRateRecovered(metrics: Record<string, number>): boolean {
    const errorRate = metrics.error_rate || 0;
    return errorRate < 1;
  }

  /**
   * Check if service is healthy
   */
  private checkServiceHealth(metrics: Record<string, number>): boolean {
    const cpuUsage = metrics.cpu_usage || 0;
    const memoryUsage = metrics.memory_usage || 0;
    const errorRate = metrics.error_rate || 0;

    // Service is healthy if: CPU < 80%, Memory < 85%, Error Rate < 1%
    return cpuUsage < 80 && memoryUsage < 85 && errorRate < 1;
  }

  /**
   * Check if specified time has elapsed
   */
  private checkTimeElapsed(alertId: string, waitMinutes: number): boolean {
    const alertTime = this.pendingAlerts.get(alertId);
    if (!alertTime) {
      return false;
    }

    const elapsed = Date.now() - alertTime.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);
    return elapsedMinutes >= waitMinutes;
  }

  /**
   * Check if alert has exceeded max wait time
   */
  private checkMaxWaitTime(alertId: string): boolean {
    const alertTime = this.pendingAlerts.get(alertId);
    if (!alertTime) {
      return false;
    }

    // Default max wait is 30 minutes
    const maxWait = 30 * 60 * 1000;
    const elapsed = Date.now() - alertTime.getTime();
    return elapsed > maxWait;
  }

  /**
   * Auto-acknowledge an alert
   */
  private async acknowledgeAlert(
    alertId: string,
    alertRuleId: string,
    rule: AutoAcknowledgmentRule
  ): Promise<void> {
    const acknowledgment: AlertAcknowledgment = {
      id: `ack-${alertId}-${Date.now()}`,
      alertId,
      ruleId: rule.id,
      acknowledgedAt: new Date(),
      acknowledgedBy: "system",
      reason: rule.description,
      resolutionMethod: "auto",
    };

    this.acknowledgments.set(acknowledgment.id, acknowledgment);

    // Execute acknowledgment actions
    for (const action of rule.actions) {
      try {
        await this.executeAcknowledgmentAction(acknowledgment, action);
      } catch (err: any) {
        logger.error(
          { err, action: action.type, acknowledgmentId: acknowledgment.id },
          "Failed to execute acknowledgment action"
        );
      }
    }

    // Clean up pending alert
    this.pendingAlerts.delete(alertId);
  }

  /**
   * Execute acknowledgment action
   */
  private async executeAcknowledgmentAction(
    ack: AlertAcknowledgment,
    action: AcknowledgmentAction
  ): Promise<void> {
    switch (action.type) {
      case "acknowledge":
        logger.info({ acknowledgmentId: ack.id, alertId: ack.alertId }, "Alert acknowledged");
        break;

      case "log":
        logger.info(
          { acknowledgmentId: ack.id, reason: ack.reason },
          action.config?.message || "Alert auto-acknowledged"
        );
        break;

      case "notify":
        logger.info(
          { channel: action.config?.channel || "#alerts", alertId: ack.alertId },
          `Alert auto-acknowledged and ${action.config?.notifyStakeholders ? "notifying stakeholders" : "logged"}`
        );
        break;

      case "auto_remediate":
        logger.info(
          { alertId: ack.alertId, remediationAction: action.config?.action },
          "Auto-remediation triggered due to alert resolution"
        );
        break;
    }
  }

  /**
   * Manually acknowledge an alert
   */
  async manuallyAcknowledge(
    alertId: string,
    alertRuleId: string,
    actor: string,
    reason: string
  ): Promise<AlertAcknowledgment> {
    const acknowledgment: AlertAcknowledgment = {
      id: `ack-${alertId}-${Date.now()}`,
      alertId,
      ruleId: alertRuleId,
      acknowledgedAt: new Date(),
      acknowledgedBy: actor,
      reason,
      resolutionMethod: "manual",
    };

    this.acknowledgments.set(acknowledgment.id, acknowledgment);
    this.pendingAlerts.delete(alertId);

    logger.info(
      { acknowledgmentId: acknowledgment.id, actor, alertId },
      "Alert manually acknowledged"
    );

    return acknowledgment;
  }

  /**
   * Record acknowledgment directly (used by event handlers)
   */
  recordAcknowledgment(ack: AlertAcknowledgment): void {
    this.acknowledgments.set(ack.id, ack);
    this.pendingAlerts.delete(ack.alertId);
    logger.info({ acknowledgmentId: ack.id, alertId: ack.alertId }, "Acknowledgment recorded");
  }

  /**
   * Get acknowledgment by ID
   */
  getAcknowledgment(ackId: string): AlertAcknowledgment | undefined {
    return this.acknowledgments.get(ackId);
  }

  /**
   * Get all acknowledgments for an alert
   */
  getAcknowledgmentsForAlert(alertId: string): AlertAcknowledgment[] {
    return Array.from(this.acknowledgments.values()).filter((ack) => ack.alertId === alertId);
  }

  /**
   * Get pending alerts
   */
  getPendingAlerts(): { alertId: string; triggeredAt: Date }[] {
    return Array.from(this.pendingAlerts.entries()).map(([alertId, triggeredAt]) => ({
      alertId,
      triggeredAt,
    }));
  }

  /**
   * Get all rules
   */
  getAllRules(): AutoAcknowledgmentRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }
}

/**
 * Default auto-acknowledgment rules
 */
export const DEFAULT_AUTO_ACK_RULES: AutoAcknowledgmentRule[] = [
  {
    id: "auto-ack-5xx-recovered",
    name: "Auto-Acknowledge 5xx Error Recovery",
    description: "Auto-acknowledge 5xx error alerts once error rate recovers",
    alertRuleId: "http-5xx-burst",
    enabled: true,
    resolutionConditions: [
      { type: "error_rate_recovered" },
      { type: "time_elapsed", waitMinutes: 2 },
    ],
    maxWaitTimeMinutes: 30,
    actions: [
      { type: "acknowledge" },
      {
        type: "log",
        config: { message: "5xx error alert auto-acknowledged due to recovery" },
      },
      {
        type: "notify",
        config: { channel: "#alerts", notifyStakeholders: false },
      },
    ],
  },
  {
    id: "auto-ack-auth-recovery",
    name: "Auto-Acknowledge Auth Failure Recovery",
    description: "Auto-acknowledge auth failure alerts once auth recovers",
    alertRuleId: "auth-failures",
    enabled: true,
    resolutionConditions: [
      { type: "metric_below_threshold", metric: "auth_failures_per_minute", threshold: 5 },
      { type: "time_elapsed", waitMinutes: 3 },
    ],
    maxWaitTimeMinutes: 30,
    actions: [
      { type: "acknowledge" },
      {
        type: "log",
        config: { message: "Auth failure alert auto-acknowledged" },
      },
    ],
  },
  {
    id: "auto-ack-service-healthy",
    name: "Auto-Acknowledge When Service Healthy",
    description: "Auto-acknowledge any alert when overall service health is restored",
    alertRuleId: "db-connection-pool-exhausted",
    enabled: true,
    resolutionConditions: [{ type: "service_healthy" }],
    maxWaitTimeMinutes: 45,
    actions: [
      { type: "acknowledge" },
      {
        type: "auto_remediate",
        config: { action: "scale_up_resources" },
      },
    ],
  },
];

// Singleton instance
let instance: AlertAcknowledgmentService | null = null;

export function getAlertAcknowledgmentService(): AlertAcknowledgmentService {
  if (!instance) {
    instance = new AlertAcknowledgmentService(DEFAULT_AUTO_ACK_RULES);
  }
  return instance;
}
