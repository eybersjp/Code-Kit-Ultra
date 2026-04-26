import { logger } from "@shared/logger";

export interface Alert {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  isResolved: boolean;
  createdAt: Date;
  source?: string;
  alertId?: string;
  escalationLevel?: number;
  metadata?: Record<string, any>;
}

export interface AlertStore {
  getAlert(alertId: string): Promise<Alert | null>;
  recordAlert(alert: Alert): Promise<void>;
  listAlerts(filters?: { resolved?: boolean; severity?: string }): Promise<Alert[]>;
  updateAlert(alertId: string, update: Partial<Alert>): Promise<void>;
}

// In-memory store for alerts (in production, would use database)
const alertsMap = new Map<string, Alert>();

class InMemoryAlertStore implements AlertStore {
  async getAlert(alertId: string): Promise<Alert | null> {
    return alertsMap.get(alertId) || null;
  }

  async recordAlert(alert: Alert): Promise<void> {
    alertsMap.set(alert.id, alert);
    logger.debug({ alertId: alert.id }, "Alert recorded");
  }

  async listAlerts(filters?: {
    resolved?: boolean;
    severity?: string;
  }): Promise<Alert[]> {
    let alerts = Array.from(alertsMap.values());

    if (filters?.resolved !== undefined) {
      alerts = alerts.filter((a) => a.isResolved === filters.resolved);
    }

    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    return alerts;
  }

  async updateAlert(alertId: string, update: Partial<Alert>): Promise<void> {
    const alert = alertsMap.get(alertId);
    if (alert) {
      alertsMap.set(alertId, { ...alert, ...update });
      logger.debug({ alertId }, "Alert updated");
    }
  }
}

let store: AlertStore | null = null;

export function getAlertStore(): AlertStore {
  if (!store) {
    store = new InMemoryAlertStore();
  }
  return store;
}

export function resetAlertStore(): void {
  store = null;
  alertsMap.clear();
}
