import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ServiceAccountStore } from '../../../../packages/auth/src/service-account-store.js';
import { AuditLogger } from '../../../../packages/audit/src/audit-logger.js';
import { logger } from '../lib/logger.js';

/**
 * POST /v1/service-accounts/:id/rotate
 * Rotate a service account secret
 */
export async function rotateServiceAccountSecretHandler(req: Request, res: Response) {
  try {
    const saId = req.params['id'] as string;
    const actorId = String((req as any).auth?.actor?.actorId || 'unknown');
    const orgId = String((req as any).auth?.org?.id || 'unknown');

    // Verify the service account exists and belongs to this org
    const sa = await ServiceAccountStore.getServiceAccount(saId, orgId);

    if (!sa) {
      return res.status(404).json({
        error: 'SERVICE_ACCOUNT_NOT_FOUND',
        message: 'Service account not found',
      });
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const newSecretHash = await bcrypt.hash(newSecret, 10);

    // Store hashed secret
    await ServiceAccountStore.rotateSecret(saId, newSecretHash);

    // Emit audit event
    await AuditLogger.emit({
      orgId,
      actor: actorId,
      action: 'service_account.secret.rotated',
      resourceType: 'service_account',
      resourceId: saId,
      result: 'success',
      payload: {
        saName: sa.name,
        rotatedBy: actorId,
      },
    });

    logger.info(
      { saId, orgId, actorId },
      'Service account secret rotated'
    );

    // Return new secret (plaintext, only sent once)
    return res.status(200).json({
      status: 'rotated',
      serviceAccountId: saId,
      newSecret, // Plaintext only - never logged or persisted
      message: 'Save this secret securely; it will not be displayed again',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to rotate service account secret');
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to rotate service account secret',
    });
  }
}
