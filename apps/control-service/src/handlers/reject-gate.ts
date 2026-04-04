import { Request, Response } from 'express';
import { GateStore } from '../../../packages/governance/src/gate-store.js';
import { AuditLogger } from '../../../packages/audit/src/audit-logger.js';
import { logger } from '../lib/logger.js';

/**
 * POST /v1/gates/:id/reject
 * Reject a gate that is in needs-review status
 */
export async function rejectGateHandler(req: Request, res: Response) {
  try {
    const { id: gateId } = req.params;
    const { reason } = req.body;
    const reviewerId = (req as any).auth?.actor?.actorId || 'unknown';
    const orgId = (req as any).auth?.org?.id || 'unknown';
    const runId = (req as any).body?.runId || 'unknown';

    if (!reason) {
      return res.status(400).json({
        error: 'MISSING_REASON',
        message: 'Rejection reason is required',
      });
    }

    // Get current gate decision
    const gateDecision = await GateStore.getGateDecision(gateId, runId);

    if (!gateDecision) {
      return res.status(404).json({
        error: 'GATE_NOT_FOUND',
        message: 'Gate decision not found',
      });
    }

    if (gateDecision.status !== 'needs-review') {
      return res.status(409).json({
        error: 'INVALID_STATE',
        message: `Cannot reject gate in ${gateDecision.status} state`,
        currentStatus: gateDecision.status,
      });
    }

    // Reject the gate
    await GateStore.rejectGate(gateId, reviewerId, reason);

    // Emit audit event
    await AuditLogger.emit({
      orgId,
      actor: reviewerId,
      action: 'gate.rejected',
      resourceType: 'gate',
      resourceId: gateId,
      result: 'success',
      payload: {
        runId,
        reason,
        previousStatus: gateDecision.status,
      },
    });

    logger.info(
      { gateId, runId, reviewerId, reason },
      'Gate rejected'
    );

    return res.status(200).json({
      status: 'rejected',
      gateId,
      runId,
      rejectedBy: reviewerId,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to reject gate');
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject gate',
    });
  }
}
