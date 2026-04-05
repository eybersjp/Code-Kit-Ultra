import type { Request, Response } from "express";
import { ApprovalService } from "../services/approval-service.js";
import {
  extractAuthContext,
  extractRunId,
  sendInternalError,
} from "../lib/handler-utils.js";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder.js";

/**
 * POST /v1/runs/:id/resume
 * Resume execution of a paused run.
 * Used after gates are approved or after manual review.
 */
export async function resumeRunHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const runId = extractRunId(req);

    await ApprovalService.resume(runId, context.actor.name);

    await new AuditEventBuilder(AuditActions.RUN_RESUMED, context)
      .withRunId(runId)
      .withResult("success")
      .emit();

    res.json({ status: "resumed", resumedBy: context.actor.name });
  } catch (err: any) {
    return sendInternalError(res, err, "resume_run");
  }
}
