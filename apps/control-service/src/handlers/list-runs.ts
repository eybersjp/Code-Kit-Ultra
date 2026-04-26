import type { Request, Response } from "express";
import { RunReader } from "../services/run-reader.js";
import { writeAuditEvent } from "../../../../packages/audit/src/index.js";
import { loadRunBundle } from "../../../../packages/memory/src/run-store.js";

export async function listRunsHandler(req: Request, res: Response) {
  try {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!auth.actor?.id || !auth.actor?.actorId || !auth.tenant?.orgId) {
      return res.status(401).json({ error: "Unauthorized: Incomplete auth context" });
    }

    const runs = RunReader.getRuns();

    // Filter to only what matches the user's org
    const filtered = runs.filter((r) => {
      if (!r?.id) return false;
      const state = loadRunBundle(r.id)?.state;
      if (!state) return true; // Legacy fallback
      if (state.orgId && state.orgId !== auth.tenant.orgId) return false;
      return true;
    });

    writeAuditEvent({
      action: "LIST_RUNS",
      actorName: auth.actor.actorName || auth.actor.actorId,
      actorId: auth.actor.actorId,
      actorType: auth.actor.actorType,
      orgId: auth.tenant.orgId,
      workspaceId: auth.tenant.workspaceId,
      projectId: auth.tenant.projectId,
      result: "success",
    });

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
