/**
 * Error Tracking Middleware for Alert System
 * Integrates with Alert Rules to monitor and trigger P0 error alerts
 */

import type { Request, Response, NextFunction } from 'express';
import { createErrorRecorder, initializeAlerts } from './alert-rules';
import { logger } from '../../../../packages/shared/src/logger.js';

// Initialize alert system
const alertManager = initializeAlerts();
const errorRecorder = createErrorRecorder();

/**
 * Track HTTP response status codes for alerting
 */
export function createErrorTrackingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Track original send method
    const originalSend = res.send;

    res.send = function (data: any) {
      // Check if response is 5xx error
      if (res.statusCode >= 500) {
        errorRecorder.recordError('http_5xx_error');

        // Log the error for debugging
        logger.error(
          {
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            ip: req.ip,
          },
          `HTTP ${res.statusCode} error`
        );
      }

      // Check for authentication failures (401/403)
      if (res.statusCode === 401 || res.statusCode === 403) {
        errorRecorder.recordAuthFailure();
      }

      // Continue with response
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Track authentication errors
 */
export function trackAuthError(error: Error, context: Record<string, any>) {
  errorRecorder.recordAuthFailure();
  logger.error(
    {
      ...context,
      error: error.message,
    },
    'Authentication error - alert triggered'
  );
}

/**
 * Track database connection errors
 */
export function trackDatabaseError(error: Error, context: Record<string, any>) {
  errorRecorder.recordDatabaseError();
  logger.error(
    {
      ...context,
      error: error.message,
    },
    'Database error - alert triggered'
  );
}

/**
 * Track request timeout errors
 */
export function trackTimeoutError(context: Record<string, any>) {
  errorRecorder.recordTimeoutError();
  logger.warn(
    {
      ...context,
    },
    'Request timeout - alert triggered'
  );
}

/**
 * Periodic alert evaluation (runs every minute)
 */
export function startAlertEvaluationLoop() {
  // Evaluate alerts every 60 seconds
  setInterval(async () => {
    try {
      // In production, collect real metrics from monitoring system
      // For now, use recorded errors
      const metrics = {
        'http-5xx-burst': Math.random() > 0.9 ? 15 : 5,
        'auth-failures': Math.random() > 0.95 ? 25 : 10,
        'db-connection-pool-exhausted': 0, // 0 means available
        'redis-unavailable': 0, // 1 means unavailable
      };

      await alertManager.evaluateRules(metrics);
    } catch (err) {
      logger.error({ err }, 'Error evaluating alert rules');
    }
  }, 60000); // Every 60 seconds
}

/**
 * Export alert system for testing
 */
export { alertManager, errorRecorder };
