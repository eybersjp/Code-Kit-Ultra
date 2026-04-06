/**
 * Alert Rules for Code Kit Ultra v1.3.0
 * Defines P0 error conditions and alert actions
 *
 * Alert Severity Levels:
 * - critical: Immediate notification required (PagerDuty + Slack)
 * - warning: Team notification (Slack + logs)
 * - info: Informational (logs only)
 */

// Logger import - use console in test environment
let logger: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  logger = require('../../../shared/src/logger').logger || console;
} catch {
  logger = console;
}

export interface AlertRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable alert name */
  name: string;
  /** Description of what triggers the alert */
  description: string;
  /** Condition that triggers the alert (e.g., "http_5xx_errors_per_minute > 10") */
  condition: string;
  /** Threshold value for the condition */
  threshold: number;
  /** Time window in seconds for aggregation */
  window: number;
  /** Alert severity: critical, warning, info */
  severity: 'critical' | 'warning' | 'info';
  /** Actions to take when alert is triggered */
  actions: AlertAction[];
  /** Whether alert is enabled */
  enabled: boolean;
}

export interface AlertAction {
  type: 'log' | 'slack' | 'pagerduty' | 'email';
  config?: Record<string, any>;
}

export interface AlertContext {
  ruleId: string;
  ruleName: string;
  currentValue: number;
  threshold: number;
  severity: string;
  timestamp: Date;
  message: string;
}

/**
 * P0 Alert Rules for v1.3.0
 * These rules monitor critical operational conditions
 */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'http-5xx-burst',
    name: '5xx Error Burst',
    description: 'Triggers when HTTP 5xx errors exceed 10 per minute',
    condition: 'http_5xx_errors_per_minute > 10',
    threshold: 10,
    window: 60,
    severity: 'critical',
    actions: [
      { type: 'log' },
      { type: 'slack', config: { channel: '#alerts', mention: '@on-call' } },
      { type: 'pagerduty', config: { severity: 'critical' } },
    ],
    enabled: true,
  },
  {
    id: 'auth-failures',
    name: 'Authentication Failures',
    description: 'Triggers when auth failures exceed 20 per minute (possible attack)',
    condition: 'auth_failures_per_minute > 20',
    threshold: 20,
    window: 60,
    severity: 'critical',
    actions: [
      { type: 'log' },
      { type: 'slack', config: { channel: '#security-alerts', mention: '@security-team' } },
      { type: 'pagerduty', config: { severity: 'critical' } },
    ],
    enabled: true,
  },
  {
    id: 'db-connection-pool-exhausted',
    name: 'Database Connection Pool Exhausted',
    description: 'Triggers when all database connections are in use',
    condition: 'db_pool_available_connections == 0',
    threshold: 0,
    window: 10,
    severity: 'critical',
    actions: [
      { type: 'log' },
      { type: 'slack', config: { channel: '#alerts' } },
      { type: 'pagerduty', config: { severity: 'critical' } },
    ],
    enabled: true,
  },
  {
    id: 'redis-unavailable',
    name: 'Redis Connection Loss',
    description: 'Triggers when Redis becomes unavailable (session revocation disabled)',
    condition: 'redis_connected == false',
    threshold: 0,
    window: 30,
    severity: 'critical',
    actions: [
      { type: 'log' },
      { type: 'slack', config: { channel: '#alerts', mention: '@on-call' } },
      { type: 'pagerduty', config: { severity: 'critical' } },
    ],
    enabled: true,
  },
  {
    id: 'request-timeout-spike',
    name: 'Request Timeout Spike',
    description: 'Triggers when request timeout rate exceeds 5%',
    condition: 'request_timeout_rate > 5',
    threshold: 5,
    window: 60,
    severity: 'warning',
    actions: [
      { type: 'log' },
      { type: 'slack', config: { channel: '#alerts' } },
    ],
    enabled: true,
  },
];

/**
 * In-memory alert metrics for tracking
 */
class AlertMetrics {
  private metrics: Map<string, number> = new Map();

  recordError(type: string): void {
    const key = `${type}_count`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  recordAuthFailure(): void {
    this.recordError('auth_failure');
  }

  recordDatabaseError(): void {
    this.recordError('database_error');
  }

  recordTimeoutError(): void {
    this.recordError('timeout_error');
  }

  getMetric(key: string): number {
    return this.metrics.get(key) || 0;
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const alertMetrics = new AlertMetrics();

/**
 * Alert Manager: Evaluates rules and triggers actions
 */
export class AlertManager {
  private rules: AlertRule[];

  constructor(rules: AlertRule[] = ALERT_RULES) {
    this.rules = rules.filter((r) => r.enabled);
  }

  /**
   * Evaluate all rules and trigger alerts if conditions are met
   */
  async evaluateRules(metrics: Record<string, number>): Promise<AlertContext[]> {
    const triggeredAlerts: AlertContext[] = [];

    for (const rule of this.rules) {
      const shouldTrigger = this.evaluateCondition(rule, metrics);

      if (shouldTrigger) {
        const context: AlertContext = {
          ruleId: rule.id,
          ruleName: rule.name,
          currentValue: metrics[rule.id] || 0,
          threshold: rule.threshold,
          severity: rule.severity,
          timestamp: new Date(),
          message: `Alert: ${rule.name} - ${rule.description}`,
        };

        triggeredAlerts.push(context);

        // Execute alert actions
        await this.executeActions(rule, context);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Evaluate a single alert rule condition
   */
  private evaluateCondition(rule: AlertRule, metrics: Record<string, number>): boolean {
    // Simple condition evaluation - in production, use expression evaluator
    // For now, check if the metric exceeds threshold
    const metricValue = metrics[rule.id] || 0;
    return metricValue > rule.threshold;
  }

  /**
   * Execute alert actions
   */
  private async executeActions(rule: AlertRule, context: AlertContext): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'log':
            logger.error(
              {
                rule: rule.id,
                severity: rule.severity,
                currentValue: context.currentValue,
                threshold: rule.threshold,
              },
              context.message
            );
            break;

          case 'slack':
            // In production, integrate with Slack API
            logger.warn(
              { channel: action.config?.channel || '#alerts' },
              `[SLACK] ${context.message}`
            );
            break;

          case 'pagerduty':
            // In production, integrate with PagerDuty API
            logger.error(
              { service: 'pagerduty', severity: action.config?.severity || 'critical' },
              `[PAGERDUTY] ${context.message}`
            );
            break;

          case 'email':
            // In production, integrate with email service
            logger.warn({ type: 'email' }, `[EMAIL] ${context.message}`);
            break;
        }
      } catch (err) {
        logger.error({ err, action: action.type }, 'Failed to execute alert action');
      }
    }
  }
}

/**
 * Initialize alert monitoring system
 */
export function initializeAlerts(): AlertManager {
  logger.info({ count: ALERT_RULES.length }, 'Initializing alert rules');
  return new AlertManager(ALERT_RULES);
}

/**
 * Hook for middleware to record errors for alerting
 */
export function createErrorRecorder() {
  return {
    recordError: (type: string) => alertMetrics.recordError(type),
    recordAuthFailure: () => alertMetrics.recordAuthFailure(),
    recordDatabaseError: () => alertMetrics.recordDatabaseError(),
    recordTimeoutError: () => alertMetrics.recordTimeoutError(),
  };
}
