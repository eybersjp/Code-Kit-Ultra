import type { Request, Response } from "express";
import { ApprovalService } from "../services/approval-service.js";
import { loadRunBundle, updateRunState } from "../../../../packages/memory/src/run-store";
import { emitGateApproved } from "../events/dispatcher.js";
import {
  extractAuthContext,
  extractRunId,
  sendForbidden,
  sendNotFound,
  sendInternalError,
  validateTenantAccess,
} from "../lib/handler-utils.js";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder.js";

export async function approveGateHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const runId = extractRunId(req);

    // Load run and validate it exists
    const bundle = loadRunBundle(runId);
    if (!bundle) {
      return sendNotFound(res, "Run not found", "run");
    }

    // Validate cross-tenant access
    try {
      validateTenantAccess(bundle.state.orgId, context);
    } catch (err: any) {
      // Log denial in audit trail
      await new AuditEventBuilder(AuditActions.GATE_APPROVE_DENIED, context)
        .withRunId(runId)
        .withResult("failure")
        .withDetails({ reason: err.message })
        .emit();

      return sendForbidden(res, err.message, "tenant_access_denied");
    }

    // Approve the gate
    await ApprovalService.approve(runId, context.actor.name);

    // Update run state with new timestamp
    bundle.state.updatedAt = new Date().toISOString();
    updateRunState(bundle.state.runId, bundle.state);

    // Log approval in audit trail
    await new AuditEventBuilder(AuditActions.GATE_APPROVED, context)
      .withRunId(runId)
      .withResult("success")
      .withCorrelationId(bundle.state.correlationId)
      .emit();

    // Emit canonical event for downstream systems
    await emitGateApproved({
      runId,
      tenant: context.tenant,
      actor: {
        id: context.actor.id,
        type: context.actor.type,
        authMode: context.actor.authMode,
      },
      correlationId: bundle.state.correlationId,
      payload: {
        actorName: context.actor.name,
        status: "approved",
      },
    });

    res.json({ status: "approved", approvedBy: context.actor.name });
  } catch (err: any) {
    return sendInternalError(res, err, "approve_gate");
  }
}
