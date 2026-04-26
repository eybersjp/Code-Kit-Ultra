import type { Request, Response } from "express";
import { RunReader } from "../services/run-reader.js";
import { writeAuditEvent } from "../../../../packages/audit/src/index.js";
import { loadRunBundle } from "../../../../packages/memory/src/run-store.js";
import { requireAnyPermission } from "../middleware/authorize.js";

// Needs exact signature for express middleware, or we could just export the function handling req/res
export async function getRunHandler(req: Request, res: Response) {
  try {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const runId = req.params.id as string;
    const run = RunReader.getRun(runId);

    if (!run) {
      writeAuditEvent({
        action: "RUN_VIEW_NOT_FOUND",
        actorName: auth.actor.actorName,
        actorId: auth.actor.actorId,
        actorType: auth.actor.actorType,
        orgId: auth.tenant.orgId,
        workspaceId: auth.tenant.workspaceId,
        projectId: auth.tenant.projectId,
        runId: runId,
        result: "failure",
      });
      return res.status(404).json({ error: "Run not found" });
    }

    // Verify tenant bounds (if scope exists on the run)
    const runState = loadRunBundle(runId)?.state;
    if (runState && runState.orgId && runState.orgId !== auth.tenant.orgId) {
      writeAuditEvent({
        action: "RUN_VIEW_DENIED",
        actorName: auth.actor.actorName,
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

    writeAuditEvent({
        action: "RUN_VIEW",
        actorName: auth.actor.actorName,
        actorId: auth.actor.actorId,
        actorType: auth.actor.actorType,
        orgId: auth.tenant.orgId,
        workspaceId: auth.tenant.workspaceId,
        projectId: auth.tenant.projectId,
        runId: runId,
        result: "success",
    });

    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
