import type { Request, Response } from "express";
import { ApprovalService } from "../services/approval-service.js";
import {
  extractAuthContext,
  extractRunId,
  sendBadRequest,
  sendInternalError,
} from "../lib/handler-utils.js";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder.js";
import { validators, ValidationError } from "../lib/validators.js";

/**
 * POST /v1/runs/:id/retry-step
 * Retry execution of a failed step.
 * Requires stepId in request body.
 */
export async function retryStepHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const runId = extractRunId(req);
    const stepId = req.body?.stepId as string | undefined;

    // Validate step ID
    try {
      validators.required(stepId, "stepId");
    } catch (err: any) {
      if (err instanceof ValidationError) {
        return sendBadRequest(res, err.message);
      }
      throw err;
    }

    await ApprovalService.retry(runId, stepId, context.actor.name);

    await new AuditEventBuilder(AuditActions.STEP_RETRIED, context)
      .withRunId(runId)
      .withStepId(stepId)
      .withResult("success")
      .emit();

    res.json({ status: "retrying", retryBy: context.actor.name });
  } catch (err: any) {
    return sendInternalError(res, err, "retry_step");
  }
}
