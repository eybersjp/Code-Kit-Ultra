import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import chalk from "chalk";
import { RunReader } from "./services/run-reader.js";
import { ApprovalService } from "./services/approval-service.js";
import { resolveApiKeyUser } from "../../../packages/core/src/auth";
import { Role } from "../../../packages/shared/src/types";
import { getLearningReport, getReliability, getAdaptivePolicies } from "./services/learning-service.js";
import { getHealingForRun, getHealingAttempt, getHealingStrategiesService, getHealingStatsService } from "./services/healing-service.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

import { authenticate } from "./middleware/authenticate.js";
import { requireAnyPermission } from "./middleware/authorize.js";
import { getSession } from "./routes/session.js";

import { createRunHandler } from "./handlers/create-run.js";
import { getRunHandler } from "./handlers/get-run.js";
import { listRunsHandler } from "./handlers/list-runs.js";
import { approveGateHandler } from "./handlers/approve-gate.js";
import { rejectGateHandler } from "./handlers/reject-gate.js";
import { rollbackStepHandler } from "./handlers/rollback/index.js";
import { 
  getHealingForRunHandler, 
  getHealingAttemptHandler, 
  getHealingStrategiesHandler, 
  getHealingStatsHandler 
} from "./handlers/healing/index.js";

import { ServiceAccountRoutes } from "./routes/service-accounts.js";

// Session endpoint
app.get("/v1/session", authenticate, getSession);

// --- Service Accounts ---
app.get("/v1/service-accounts", authenticate, requireAnyPermission(["service_account:view", "service_account:manage"]), ServiceAccountRoutes.list);
app.post("/v1/service-accounts", authenticate, requireAnyPermission(["service_account:manage"]), ServiceAccountRoutes.create);
app.delete("/v1/service-accounts/:id", authenticate, requireAnyPermission(["service_account:manage"]), ServiceAccountRoutes.delete);


// --- Health ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "1.2.0-enterprise-hardened" });
});

// --- Runs ---
app.post("/runs", authenticate, requireAnyPermission(["run:create"]), createRunHandler);
app.get("/runs", authenticate, requireAnyPermission(["run:view"]), listRunsHandler);
app.get("/runs/:id", authenticate, requireAnyPermission(["run:view"]), getRunHandler);

app.get("/runs/:id/timeline", authenticate, requireAnyPermission(["run:view"]), async (req, res) => {
  try {
    const timeline = RunReader.getTimeline(req.params.id as string);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Approvals ---
app.get("/approvals", authenticate, requireAnyPermission(["gate:view"]), async (req, res) => {
  try {
    const approvals = ApprovalService.getApprovals();
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/approvals/:id/approve", authenticate, requireAnyPermission(["gate:approve"]), approveGateHandler);
app.post("/approvals/:id/reject", authenticate, requireAnyPermission(["gate:reject"]), rejectGateHandler);

app.post("/runs/:id/resume", authenticate, requireAnyPermission(["run:create", "healing:invoke"]), async (req, res) => {
  try {
    const actorName = (req as any).auth?.actor?.actorName || "Unknown Actor";
    await ApprovalService.resume(req.params.id as string, actorName);
    res.json({ status: "resumed", resumedBy: actorName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/runs/:id/retry-step", authenticate, requireAnyPermission(["run:create", "healing:invoke"]), async (req, res) => {
  try {
    const actorName = (req as any).auth?.actor?.actorName || "Unknown Actor";
    await ApprovalService.retry(req.params.id as string, req.body.stepId as string, actorName);
    res.json({ status: "retrying", retryBy: actorName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/runs/:id/rollback-step", authenticate, requireAnyPermission(["execution:rollback"]), rollbackStepHandler);

// --- Learning ---
app.get("/learning/report", authenticate, requireAnyPermission(["policy:view", "execution:view"]), (req, res) => {
  try {
    res.json(getLearningReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/learning/reliability", authenticate, requireAnyPermission(["policy:view", "execution:view"]), (req, res) => {
  try {
    res.json(getReliability());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/learning/policies", authenticate, requireAnyPermission(["policy:view"]), (req, res) => {
  try {
    res.json(getAdaptivePolicies());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Healing ---
app.get("/runs/:runId/healing", authenticate, requireAnyPermission(["run:view"]), getHealingForRunHandler);
app.get("/runs/:runId/healing/:attemptId", authenticate, requireAnyPermission(["run:view"]), getHealingAttemptHandler);
app.get("/healing/strategies", authenticate, requireAnyPermission(["healing:invoke", "run:view"]), getHealingStrategiesHandler);
app.get("/healing/stats", authenticate, requireAnyPermission(["run:view"]), getHealingStatsHandler);

// Export the app for testing
export { app };

if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(chalk.green(`\n🚀 Code Kit Hardened Control Service running at http://localhost:${PORT}`));
    console.log(chalk.dim(`RBAC and Audit logging enabled\n`));
  });
}
