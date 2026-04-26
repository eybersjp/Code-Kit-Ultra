import type { Request, Response } from 'express';
import { GateStore } from '../../../../packages/governance/src/gate-store.js';
import { logger } from '../lib/logger.js';
import {
  extractAuthContext,
  extractGateId,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendInternalError,
} from '../lib/handler-utils.js';
import { AuditEventBuilder, AuditActions } from '../lib/audit-builder.js';
import {
  validators,
  ValidationError,
} from '../lib/validators.js';

/**
 * POST /v1/gates/:id/reject
 * Reject a gate that is in needs-review status.
 * Requires a reason for the rejection.
 */
export async function rejectGateHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const gateId = extractGateId(req);
    const reason = req.body?.reason as string | undefined;
    const runId = req.body?.runId as string | undefined;

    // Validate required fields
    try {
      validators.required(reason, 'reason');
      validators.minLength(reason || '', 5, 'reason');
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        return sendBadRequest(res, err.message);
      }
      throw err;
    }

    if (!runId) {
      return sendBadRequest(res, 'runId is required');
    }
    if (!reason) {
      return sendBadRequest(res, 'reason is required');
    }

    // Get current gate decision
    const gateDecision = await GateStore.getGateDecision(gateId, runId);

    if (!gateDecision) {
      return sendNotFound(res, 'Gate decision not found', 'gate');
    }

    if (gateDecision.status !== 'needs-review') {
      return sendConflict(res,
        `Cannot reject gate in ${gateDecision.status} state`,
        { currentStatus: gateDecision.status }
      );
    }

    // Reject the gate
    await GateStore.rejectGate(gateId, context.actor.id, reason);

    // Log rejection in audit trail
    await new AuditEventBuilder(AuditActions.GATE_REJECTED, context)
      .withGateId(gateId)
      .withRunId(runId)
      .withResult('success')
      .withDetails({
        reason,
        previousStatus: gateDecision.status,
      })
      .emit();

    logger.info(
      { gateId, runId, actor: context.actor.id, reason },
      'Gate rejected'
    );

    res.status(200).json({
      status: 'rejected',
      gateId,
      runId,
      rejectedBy: context.actor.name,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return sendInternalError(res, error, 'reject_gate');
  }
}
