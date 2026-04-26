// @ts-nocheck
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import chalk from "chalk";
import { resolveApiKeyUser } from "../../../packages/core/src/auth";
import { Role } from "../../../packages/shared/src/types";
import { getHealingForRun, getHealingAttempt, getHealingStrategiesService, getHealingStatsService } from "./services/healing-service.js";
import { runMigrations } from "./db/migrate.js";
import { closePool } from "./db/pool.js";
import { seedDatabase } from "./db/seed.js";
import healthRoutes from "./routes/health.js";
import { logger } from "./lib/logger.js";
import { initializeRevocationStore, closeRevocationStore } from "../../../packages/auth/src/session-revocation.js";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics.js";
import { securityHeaders, httpsRedirect } from "./middleware/security-headers.js";
import { globalRateLimiter, tokenCreationRateLimiter } from "./middleware/rate-limit.js";

const app = express();
const PORT = process.env.PORT || 7474;

app.use(httpsRedirect);
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CKU_ALLOWED_ORIGINS?.split(',') || ['http://localhost:7473'],
  credentials: true,
}));
app.use(express.json());
app.use(metricsMiddleware);
app.use(globalRateLimiter);

import { authenticate } from "./middleware/authenticate.js";
import { requireAnyPermission } from "./middleware/authorize.js";
import { getSession } from "./routes/session.js";

import { createRunHandler } from "./handlers/create-run.js";
import { getRunHandler } from "./handlers/get-run.js";
import { listRunsHandler } from "./handlers/list-runs.js";
import { approveGateHandler } from "./handlers/approve-gate.js";
import { rejectGateHandler } from "./handlers/reject-gate.js";
import { rollbackStepHandler } from "./handlers/rollback/index.js";
import { rotateServiceAccountSecretHandler } from "./handlers/rotate-service-account-secret.js";
import { deleteSessionHandler } from "./handlers/delete-session.js";
import { getTimelineHandler } from "./handlers/get-timeline.js";
import { listGatesHandler } from "./handlers/list-gates.js";
import { resumeRunHandler } from "./handlers/resume-run.js";
import { retryStepHandler } from "./handlers/retry-step.js";
import { getLearningReportHandler } from "./handlers/get-learning-report.js";
import { getLearningReliabilityHandler } from "./handlers/get-learning-reliability.js";
import { getLearningPoliciesHandler } from "./handlers/get-learning-policies.js";
import {
  getHealingForRunHandler,
  getHealingAttemptHandler,
  getHealingStrategiesHandler,
  getHealingStatsHandler
} from "./handlers/healing/index.js";
import {
  getAutomationStatusHandler,
  setAutomationModeHandler,
  getAutoApprovalRulesHandler,
  getAlertAcknowledgmentRulesHandler,
  getHealingStrategiesHandler as getAutomationHealingStrategiesHandler,
  getRollbackStrategiesHandler
} from "./handlers/get-automation-status.js";

import { ServiceAccountRoutes } from "./routes/service-accounts.js";
import { verifyRevocation } from "./middleware/verify-revocation.js";

// --- Health & Metrics (no auth required)
app.use(healthRoutes);
app.get('/metrics', metricsHandler);

// Revocation check middleware (after authentication)
app.use(authenticate, verifyRevocation);

// --- Session endpoints
app.get("/v1/session", getSession);
app.delete("/v1/sessions/me", deleteSessionHandler);

// --- Service Accounts ---
app.get("/v1/service-accounts", requireAnyPermission(["service_account:view", "service_account:manage"]), ServiceAccountRoutes.list);
app.post("/v1/service-accounts", requireAnyPermission(["service_account:manage"]), ServiceAccountRoutes.create);
app.delete("/v1/service-accounts/:id", requireAnyPermission(["service_account:manage"]), ServiceAccountRoutes.delete);
app.post("/v1/service-accounts/:id/rotate", tokenCreationRateLimiter, requireAnyPermission(["service_account:manage"]), rotateServiceAccountSecretHandler);

// --- Runs (now under /v1/) ---
app.post("/v1/runs", authenticate, requireAnyPermission(["run:create"]), createRunHandler);
app.get("/v1/runs", authenticate, requireAnyPermission(["run:view"]), listRunsHandler);
app.get("/v1/runs/:id", authenticate, requireAnyPermission(["run:view"]), getRunHandler);

app.get("/v1/runs/:id/timeline", authenticate, requireAnyPermission(["run:view"]), getTimelineHandler);

// --- Approvals ---
app.get("/v1/gates", authenticate, requireAnyPermission(["gate:view"]), listGatesHandler);

app.post("/v1/gates/:id/approve", authenticate, requireAnyPermission(["gate:approve"]), approveGateHandler);
app.post("/v1/gates/:id/reject", authenticate, requireAnyPermission(["gate:reject"]), rejectGateHandler);

app.post("/v1/runs/:id/resume", authenticate, requireAnyPermission(["run:create", "healing:invoke"]), resumeRunHandler);

app.post("/v1/runs/:id/retry-step", authenticate, requireAnyPermission(["run:create", "healing:invoke"]), retryStepHandler);

app.post("/v1/runs/:id/rollback-step", authenticate, requireAnyPermission(["execution:rollback"]), rollbackStepHandler);

// --- Learning ---
app.get("/v1/learning/report", authenticate, requireAnyPermission(["policy:view", "execution:view"]), getLearningReportHandler);

app.get("/v1/learning/reliability", authenticate, requireAnyPermission(["policy:view", "execution:view"]), getLearningReliabilityHandler);

app.get("/v1/learning/policies", authenticate, requireAnyPermission(["policy:view"]), getLearningPoliciesHandler);

// --- Automation ---
app.get("/v1/automation/status", authenticate, requireAnyPermission(["automation:view"]), getAutomationStatusHandler);
app.post("/v1/automation/mode", authenticate, requireAnyPermission(["automation:manage"]), setAutomationModeHandler);
app.get("/v1/automation/approvals", authenticate, requireAnyPermission(["automation:view"]), getAutoApprovalRulesHandler);
app.get("/v1/automation/alerts", authenticate, requireAnyPermission(["automation:view"]), getAlertAcknowledgmentRulesHandler);
app.get("/v1/automation/healing", authenticate, requireAnyPermission(["automation:view"]), getAutomationHealingStrategiesHandler);
app.get("/v1/automation/rollback", authenticate, requireAnyPermission(["automation:view"]), getRollbackStrategiesHandler);

// --- Healing ---
app.get("/v1/runs/:runId/healing", authenticate, requireAnyPermission(["run:view"]), getHealingForRunHandler);
app.get("/v1/runs/:runId/healing/:attemptId", authenticate, requireAnyPermission(["run:view"]), getHealingAttemptHandler);
app.get("/v1/healing/strategies", authenticate, requireAnyPermission(["healing:invoke", "run:view"]), getHealingStrategiesHandler);
app.get("/v1/healing/stats", authenticate, requireAnyPermission(["run:view"]), getHealingStatsHandler);

// Export the app for testing
export { app };

async function startServer() {
  try {
    logger.info('Starting Code Kit Ultra Control Service');

    // Run database migrations
    logger.info('Running database migrations...');
    await runMigrations();

    // Initialize revocation store (Redis)
    logger.info('Initializing session revocation store...');
    await initializeRevocationStore();

    // Seed database if environment variable is set (development only)
    if (process.env.SEED_DATABASE === 'true') {
      logger.info('Seeding database with development fixtures...');
      await seedDatabase();
    }

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(
        { port: PORT, version: '1.3.0' },
        '🚀 Code Kit Ultra Control Service started'
      );
      logger.info('API available at /v1/ prefix');
      logger.info('Health endpoint: GET /health');
      logger.info('Readiness endpoint: GET /ready');
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      // Stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close revocation store
        try {
          await closeRevocationStore();
          logger.info('Revocation store closed');
        } catch (err) {
          logger.error({ err }, 'Error closing revocation store');
        }

        // Close database pool
        try {
          await closePool();
          logger.info('Database pool closed');
        } catch (err) {
          logger.error({ err }, 'Error closing database pool');
        }

        process.exit(0);
      });

      // Timeout for graceful shutdown
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
