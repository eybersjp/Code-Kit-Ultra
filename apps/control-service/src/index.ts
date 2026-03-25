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

// --- Auth Middleware ---
function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-api-key"] as string;
    const user = resolveApiKeyUser(apiKey);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: Role ${user.role} does not have permission` });
    }

    (req as any).user = user;
    next();
  };
}

// --- Health ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "1.2.0-enterprise-hardened" });
});

// --- Runs ---
app.get("/runs", requireRole(["admin", "operator", "reviewer", "viewer"]), async (req, res) => {
  try {
    const runs = RunReader.getRuns();
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/runs/:id", requireRole(["admin", "operator", "reviewer", "viewer"]), async (req, res) => {
  try {
    const run = RunReader.getRun(req.params.id);
    if (!run) return res.status(404).json({ error: "Run not found" });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/runs/:id/timeline", requireRole(["admin", "operator", "reviewer", "viewer"]), async (req, res) => {
  try {
    const timeline = RunReader.getTimeline(req.params.id);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Approvals ---
app.get("/approvals", requireRole(["admin", "operator", "reviewer"]), async (req, res) => {
  try {
    const approvals = ApprovalService.getApprovals();
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/approvals/:id/approve", requireRole(["admin", "reviewer"]), async (req, res) => {
  try {
    const user = (req as any).user;
    await ApprovalService.approve(req.params.id, user.name);
    res.json({ status: "approved", approvedBy: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/approvals/:id/reject", requireRole(["admin", "reviewer"]), async (req, res) => {
  try {
    const user = (req as any).user;
    ApprovalService.reject(req.params.id, user.name);
    res.json({ status: "rejected", rejectedBy: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/runs/:id/resume", requireRole(["admin", "operator"]), async (req, res) => {
  try {
    const user = (req as any).user;
    await ApprovalService.resume(req.params.id, user.name);
    res.json({ status: "resumed", resumedBy: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/runs/:id/retry-step", requireRole(["admin", "operator"]), async (req, res) => {
  try {
    const user = (req as any).user;
    await ApprovalService.retry(req.params.id, req.body.stepId, user.name);
    res.json({ status: "retrying", retryBy: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/runs/:id/rollback-step", requireRole(["admin"]), async (req, res) => {
  try {
    const user = (req as any).user;
    await ApprovalService.rollback(req.params.id, req.body.stepId, user.name);
    res.json({ status: "rolled-back", rollbackBy: user.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Learning ---
app.get("/learning/report", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  try {
    res.json(getLearningReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/learning/reliability", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  try {
    res.json(getReliability());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/learning/policies", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  try {
    res.json(getAdaptivePolicies());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Healing ---
app.get("/runs/:runId/healing", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  res.json({ attempts: getHealingForRun(req.params.runId) });
});

app.get("/runs/:runId/healing/:attemptId", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  res.json({ attempt: getHealingAttempt(req.params.runId, req.params.attemptId) });
});

app.get("/healing/strategies", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  res.json({ strategies: getHealingStrategiesService() });
});

app.get("/healing/stats", requireRole(["admin", "operator", "reviewer", "viewer"]), (req, res) => {
  res.json({ stats: getHealingStatsService() });
});

app.listen(PORT, () => {
  console.log(chalk.green(`\n🚀 Code Kit Hardened Control Service running at http://localhost:${PORT}`));
  console.log(chalk.dim(`RBAC and Audit logging enabled\n`));
});
