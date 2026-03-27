import type { Request, Response } from "express";
import { getHealingForRun, getHealingAttempt, getHealingStrategiesService, getHealingStatsService } from "../../services/healing-service.js";
import { writeAuditEvent } from "../../../../../packages/audit/src/index";
import { loadRunBundle } from "../../../../../packages/memory/src/run-store";

function verifyHealingTenant(req: Request, res: Response, runId: string) {
  const auth = (req as any).auth;
  const bundle = loadRunBundle(runId);
  if (!bundle) return { valid: false, response: res.status(404).json({ error: "Run not found" }) };

  if (bundle.state.orgId && bundle.state.orgId !== auth.tenant.orgId) {
    const actorName = auth.actor.actorName || "Unknown Actor";
    writeAuditEvent({
         action: "HEALING_VIEW_DENIED",
         actorName,
         actorId: auth.actor.actorId,
         actorType: auth.actor.actorType,
         orgId: auth.tenant.orgId,
         workspaceId: auth.tenant.workspaceId,
         projectId: auth.tenant.projectId,
         runId,
         result: "failure",
    });
    return { valid: false, response: res.status(403).json({ error: "Run belongs to a different organization." }) };
  }
  return { valid: true };
}

export function getHealingForRunHandler(req: Request, res: Response) {
  const runId = req.params.runId as string;
  const { valid, response } = verifyHealingTenant(req, res, runId);
  if (!valid) return response;
  res.json({ attempts: getHealingForRun(runId) });
}

export function getHealingAttemptHandler(req: Request, res: Response) {
  const runId = req.params.runId as string;
  const attemptId = req.params.attemptId as string;
  const { valid, response } = verifyHealingTenant(req, res, runId);
  if (!valid) return response;
  res.json({ attempt: getHealingAttempt(runId, attemptId) });
}

export function getHealingStrategiesHandler(req: Request, res: Response) {
  // Global reading
  res.json({ strategies: getHealingStrategiesService() });
}

export function getHealingStatsHandler(req: Request, res: Response) {
  // Global reading
  res.json({ stats: getHealingStatsService() });
}
