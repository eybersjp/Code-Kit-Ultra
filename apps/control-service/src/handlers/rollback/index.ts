import type { Request, Response } from "express";
import { ApprovalService } from "../../services/approval-service.js";
import { writeAuditEvent } from "../../../../../packages/audit/src/index";
import { loadRunBundle } from "../../../../../packages/memory/src/run-store";

export async function rollbackStepHandler(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    const actorName = auth.actor.actorName || "Unknown Actor";
    const runId = req.params.id as string;
    const bundle = loadRunBundle(runId);
    if (!bundle) return res.status(404).json({ error: "Run not found" });

    if (bundle.state.orgId && bundle.state.orgId !== auth.tenant.orgId) {
       writeAuditEvent({
         action: "ROLLBACK_DENIED",
         actorName,
         actorId: auth.actor.actorId,
         actorType: auth.actor.actorType,
         orgId: auth.tenant.orgId,
         workspaceId: auth.tenant.workspaceId,
         projectId: auth.tenant.projectId,
         runId: runId,
         result: "failure",
       });
       return res.status(403).json({ error: "Run belongs to a different organization." });
    }

    await ApprovalService.rollback(runId, req.body.stepId, actorName);
    
    writeAuditEvent({
      action: "ROLLBACK_INVOKED",
      actorName,
      actorId: auth.actor.actorId,
      actorType: auth.actor.actorType,
      orgId: auth.tenant.orgId,
      workspaceId: auth.tenant.workspaceId,
      projectId: auth.tenant.projectId,
      runId: runId,
      correlationId: bundle.state.correlationId,
      result: "success",
    });

    res.json({ status: "rolled-back", rollbackBy: actorName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
