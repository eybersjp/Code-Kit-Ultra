import type { Request, Response } from "express";
import type { Mode } from "../../../../packages/shared/src/types.js";
import { runVerticalSlice } from "../../../../packages/orchestrator/src";
import crypto from "node:crypto";
import path from "node:path";
import { writeAuditEvent } from "../../../../packages/audit/src/index.js";
import { loadRunBundle, updateRunState, updateIntake, updatePlan } from "../../../../packages/memory/src/run-store.js";
import { emitRunCreated } from "../events/dispatcher.js";

export async function createRunHandler(req: Request, res: Response) {
  try {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!auth.actor?.actorId || !auth.actor?.actorType || !auth.tenant?.orgId) {
      return res.status(401).json({ error: "Unauthorized: Incomplete auth context" });
    }

    // Must require project scope - check BEFORE validating request body
    if (!auth?.tenant?.projectId) {
      return res.status(403).json({ error: "Run creation requires a project scope (projectId missing in token)." });
    }

    const { idea, mode = "expert" as Mode, dryRun = false } = req.body as { idea: string; mode?: Mode; dryRun?: boolean };
    if (!idea || typeof idea !== "string") {
      return res.status(400).json({ error: "Bad request: idea is required and must be a string" });
    }
    if (typeof mode !== "string") {
      return res.status(400).json({ error: "Bad request: mode must be a string" });
    }

    const correlationId = crypto.randomUUID();

    // trigger runVerticalSlice
    const result = await runVerticalSlice({
      idea,
      mode,
      dryRun
    });

    if (!result?.report) {
      return res.status(500).json({ error: "Internal error: Invalid orchestrator result" });
    }
    if (!result.artifactDirectory) {
      return res.status(500).json({ error: "Internal error: Missing artifact directory" });
    }

    const runId = result.report.id || path.basename(result.artifactDirectory) || "unknown";
    if (!runId || runId === "unknown") {
      return res.status(500).json({ error: "Internal error: Could not determine run ID" });
    }

    // Set scope metadata on the new run
    // In a real system, we'd update the DB. For this patch, we update the persisted state:
    let bundle = loadRunBundle(runId);

    if (!bundle) {
      // Initialize a Phase 8+ bundle from the Phase 7 report if it doesn't exist yet
      if (!result.report.createdAt) {
        return res.status(500).json({ error: "Internal error: Missing createdAt timestamp" });
      }

      const intake = {
        runId,
        createdAt: result.report.createdAt,
        idea,
        input: result.report.input || "",
        assumptions: result.report.assumptions || [],
        clarifyingQuestions: result.report.clarifyingQuestions || [],
      };
      const plan = {
        runId,
        createdAt: result.report.createdAt,
        summary: result.report.summary || "Newly created run",
        selectedSkills: (result.report.selectedSkills || []).map(s => ({ skillId: s?.skillId || "", reason: s?.reason || "", source: "generated" as const })),
        tasks: [], // We'll populate tasks during planning/building phase transition
      };
      const state = {
        runId,
        createdAt: result.report.createdAt,
        updatedAt: result.report.createdAt,
        currentStepIndex: 0,
        status: "planned" as const,
        approvalRequired: false,
        approved: false,
        orgId: auth.tenant.orgId,
        workspaceId: auth.tenant.workspaceId,
        projectId: auth.tenant.projectId,
        actorId: auth.actor.actorId,
        actorType: auth.actor.actorType,
        correlationId: correlationId,
      };

      updateIntake(runId, intake);
      updatePlan(runId, plan);
      updateRunState(runId, state);
    } else {
      if (!bundle.state) {
        return res.status(500).json({ error: "Internal error: Invalid run bundle state" });
      }
      bundle.state.actorId = auth.actor.actorId;
      bundle.state.actorType = auth.actor.actorType;
      bundle.state.orgId = auth.tenant.orgId;
      bundle.state.workspaceId = auth.tenant.workspaceId;
      bundle.state.projectId = auth.tenant.projectId;
      bundle.state.correlationId = correlationId;
      updateRunState(runId, bundle.state);
    }

    writeAuditEvent({
      runId,
      actorName: auth.actor.actorName || auth.actor.actorId,
      actorId: auth.actor.actorId,
      actorType: auth.actor.actorType,
      orgId: auth.tenant.orgId,
      workspaceId: auth.tenant.workspaceId,
      projectId: auth.tenant.projectId,
      correlationId: correlationId,
      action: "RUN_CREATED",
    });

    // Wave 5: Emit canonical event
    await emitRunCreated({
      runId,
      tenant: auth.tenant,
      actor: {
        id: auth.actor.actorId,
        type: auth.actor.actorType,
        authMode: auth.actor.authMode || "bearer-session"
      },
      correlationId: correlationId,
      payload: {
        idea: idea,
        mode: mode,
        status: result.overallGateStatus || "unknown"
      }
    });

    res.status(201).json({
      runId,
      status: result.overallGateStatus,
      correlationId
    });
  } catch (err: any) {
    console.error("[createRunHandler] Caught exception:", err);
    res.status(500).json({ error: err.message });
  }
}
