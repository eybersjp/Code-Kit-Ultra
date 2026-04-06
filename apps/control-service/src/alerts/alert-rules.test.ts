import { describe, it, expect, beforeEach } from 'vitest';
import { AlertManager, ALERT_RULES, AlertContext, alertMetrics } from './alert-rules';

describe('Alert Rules System', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager(ALERT_RULES);
    alertMetrics.reset();
  });

  describe('Alert Rule Configuration', () => {
    it('should define critical P0 alert rules', () => {
      expect(ALERT_RULES.length).toBeGreaterThan(0);

      const criticalRules = ALERT_RULES.filter((r) => r.severity === 'critical');
      expect(criticalRules.length).toBeGreaterThan(0);
    });

    it('should have 5xx error burst alert', () => {
      const rule = ALERT_RULES.find((r) => r.id === 'http-5xx-burst');
      expect(rule).toBeDefined();
      expect(rule?.threshold).toBe(10);
      expect(rule?.window).toBe(60);
      expect(rule?.enabled).toBe(true);
    });

    it('should have authentication failure alert', () => {
      const rule = ALERT_RULES.find((r) => r.id === 'auth-failures');
      expect(rule).toBeDefined();
      expect(rule?.threshold).toBe(20);
      expect(rule?.severity).toBe('critical');
    });

    it('should have database pool exhaustion alert', () => {
      const rule = ALERT_RULES.find((r) => r.id === 'db-connection-pool-exhausted');
      expect(rule).toBeDefined();
      expect(rule?.severity).toBe('critical');
    });

    it('should have Redis availability alert', () => {
      const rule = ALERT_RULES.find((r) => r.id === 'redis-unavailable');
      expect(rule).toBeDefined();
      expect(rule?.severity).toBe('critical');
    });

    it('should all rules have enabled status', () => {
      ALERT_RULES.forEach((rule) => {
        expect(typeof rule.enabled).toBe('boolean');
      });
    });
  });

  describe('Alert Actions', () => {
    it('should define actions for critical alerts', () => {
      const criticalRule = ALERT_RULES.find((r) => r.severity === 'critical');
      expect(criticalRule?.actions.length).toBeGreaterThan(0);
    });

    it('should include logging action for all alerts', () => {
      ALERT_RULES.forEach((rule) => {
        const hasLogAction = rule.actions.some((a) => a.type === 'log');
        expect(hasLogAction).toBe(true);
      });
    });

    it('should include Slack action for critical P0 alerts', () => {
      const criticalRules = ALERT_RULES.filter((r) => r.severity === 'critical');
      criticalRules.forEach((rule) => {
        const hasSlackAction = rule.actions.some((a) => a.type === 'slack');
        expect(hasSlackAction).toBe(true);
      });
    });

    it('should include PagerDuty action for critical P0 alerts', () => {
      const criticalRules = ALERT_RULES.filter((r) => r.severity === 'critical');
      criticalRules.forEach((rule) => {
        const hasPagerDutyAction = rule.actions.some((a) => a.type === 'pagerduty');
        expect(hasPagerDutyAction).toBe(true);
      });
    });
  });

  describe('Alert Evaluation', () => {
    it('should evaluate rules against metrics', async () => {
      const metrics = {
        'http-5xx-burst': 15, // Exceeds threshold of 10
      };

      const alerts = await alertManager.evaluateRules(metrics);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should trigger alert when 5xx errors exceed threshold', async () => {
      const metrics = {
        'http-5xx-burst': 12, // Exceeds 10
      };

      const alerts = await alertManager.evaluateRules(metrics);
      const httpAlert = alerts.find((a) => a.ruleId === 'http-5xx-burst');
      expect(httpAlert).toBeDefined();
      expect(httpAlert?.currentValue).toBe(12);
      expect(httpAlert?.threshold).toBe(10);
    });

    it('should trigger alert when auth failures exceed threshold', async () => {
      const metrics = {
        'auth-failures': 25, // Exceeds 20
      };

      const alerts = await alertManager.evaluateRules(metrics);
      const authAlert = alerts.find((a) => a.ruleId === 'auth-failures');
      expect(authAlert).toBeDefined();
      expect(authAlert?.severity).toBe('critical');
    });

    it('should not trigger alert when metrics are below threshold', async () => {
      const metrics = {
        'http-5xx-burst': 5, // Below 10
        'auth-failures': 10, // Below 20
      };

      const alerts = await alertManager.evaluateRules(metrics);
      expect(alerts.length).toBe(0);
    });
  });

  describe('Alert Context', () => {
    it('should include alert metadata in context', async () => {
      const metrics = {
        'http-5xx-burst': 15,
      };

      const alerts = await alertManager.evaluateRules(metrics);
      const alert = alerts[0];

      expect(alert).toHaveProperty('ruleId');
      expect(alert).toHaveProperty('ruleName');
      expect(alert).toHaveProperty('currentValue');
      expect(alert).toHaveProperty('threshold');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('timestamp');
      expect(alert).toHaveProperty('message');
    });

    it('should have valid timestamp in alert context', async () => {
      const metrics = {
        'http-5xx-burst': 15,
      };

      const alerts = await alertManager.evaluateRules(metrics);
      const alert = alerts[0];

      expect(alert.timestamp).toBeInstanceOf(Date);
      expect(alert.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Multiple Alert Triggering', () => {
    it('should trigger multiple alerts simultaneously', async () => {
      const metrics = {
        'http-5xx-burst': 15,
        'auth-failures': 25,
        'db-connection-pool-exhausted': 0,
      };

      const alerts = await alertManager.evaluateRules(metrics);
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Alert Rule Composition', () => {
    it('should have description for all rules', () => {
      ALERT_RULES.forEach((rule) => {
        expect(rule.description).toBeDefined();
        expect(rule.description.length).toBeGreaterThan(0);
      });
    });

    it('should have condition for all rules', () => {
      ALERT_RULES.forEach((rule) => {
        expect(rule.condition).toBeDefined();
        expect(rule.condition.length).toBeGreaterThan(0);
      });
    });

    it('should have reasonable time windows', () => {
      ALERT_RULES.forEach((rule) => {
        expect(rule.window).toBeGreaterThan(0);
        expect(rule.window).toBeLessThanOrEqual(3600); // Max 1 hour
      });
    });
  });
});
