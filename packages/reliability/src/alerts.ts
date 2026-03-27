/**
 * Threshold-based Alerting Logic for SaaS Hardening.
 */

import { Logger } from "./logger.js";

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const ERROR_THRESHOLD = 5; // failures per minute
let errorCount = 0;
let lastReset = Date.now();

export async function checkAlertThresholds(type: string, details: any) {
  if (!ALERT_WEBHOOK_URL) return;

  // Simple window-based thresholding
  const now = Date.now();
  if (now - lastReset > 60000) {
    errorCount = 0;
    lastReset = now;
  }

  errorCount++;

  if (errorCount >= ERROR_THRESHOLD || type === "security_violation") {
    await triggerAlert(type, details);
  }
}

async function triggerAlert(type: string, details: any) {
  const payload = {
    severity: type === "security_violation" ? "P0" : "P1",
    type,
    timestamp: new Date().toISOString(),
    details,
    source: "code-kit-ultra-saas"
  };

  Logger.error(`ALERT TRIGGERED: ${type}`, { orgId: details.orgId });

  try {
    await fetch(ALERT_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    Logger.error("Failed to send alert to webhook", {}, err);
  }
}
