import { Request, Response, NextFunction } from 'express';
import { isRevoked } from '../../../../packages/auth/src/session-revocation.js';
import { logger } from '../lib/logger.js';

/**
 * Middleware to check if a session JWT has been revoked
 * Should be called after JWT verification
 */
export async function verifyRevocation(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.auth;

    if (!session) {
      // No session to check
      return next();
    }

    // Session ID is in the actor context
    const sessionId = session.actor?.actorId;
    if (!sessionId) {
      // No session ID available
      return next();
    }

    // Check if session is revoked
    const revoked = await isRevoked(sessionId);

    if (revoked) {
      logger.warn({ sessionId }, 'Revoked token used');
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Session has been revoked',
      });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Error checking revocation');
    // On error, fail open (allow request) but log the issue
    next();
  }
}
