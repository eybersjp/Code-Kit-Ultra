import type { Request, Response } from "express";
import { ApprovalService } from "../services/approval-service.js";
import { writeAuditEvent } from "../../../../packages/audit/src/index";
import { loadRunBundle, updateRunState } from "../../../../packages/memory/src/run-store";
import { emitGateApproved } from "../events/dispatcher.js";

export async function approveGateHandler(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    const actorName = auth.actor.actorName || "Unknown Actor";
    
    // In wave 3, check tenant scope
    const runId = req.params.id as string;
    const bundle = loadRunBundle(runId);
    if (!bundle) return res.status(404).json({ error: "Run not found" });

    if (bundle.state.orgId && bundle.state.orgId !== auth.tenant.orgId) {
       writeAuditEvent({
         action: "GATE_APPROVE_DENIED",
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
    
    await ApprovalService.approve(runId, actorName);
    
    // Add approver identity to the run state.
    bundle.state.updatedAt = new Date().toISOString();
    updateRunState(bundle.state.runId, bundle.state);

    writeAuditEvent({
      action: "GATE_APPROVED",
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

    // Wave 5: Emit canonical event
    await emitGateApproved({
      runId,
      tenant: auth.tenant,
      actor: {
        id: auth.actor.actorId,
        type: auth.actor.actorType,
        authMode: auth.actor.authMode || "bearer-session"
      },
      correlationId: bundle.state.correlationId,
      payload: {
        actorName,
        status: "approved"
      }
    });

    res.json({ status: "approved", approvedBy: actorName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
