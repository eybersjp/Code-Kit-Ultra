import { Request, Response } from 'express';
import { revokeSession } from '../../../../packages/auth/src/session-revocation.js';
import { logger } from '../lib/logger.js';

/**
 * DELETE /v1/sessions/me
 * Revoke current session
 */
export async function deleteSessionHandler(req: Request, res: Response) {
  try {
    const auth = req.auth;

    if (!auth) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No active session',
      });
    }

    // Calculate remaining TTL (default 10 minutes from now)
    const remainingTtl = 10 * 60;

    // Revoke the session using actor ID
    const sessionId = auth.actor.actorId;
    if (!sessionId) {
      return res.status(401).json({ error: "Invalid session" });
    }

    await revokeSession(sessionId, remainingTtl);

    logger.info({ userId: auth.actor.actorId }, 'Session revoked');

    return res.status(200).json({
      status: 'revoked',
      message: 'Session has been revoked',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to revoke session');
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke session',
    });
  }
}
