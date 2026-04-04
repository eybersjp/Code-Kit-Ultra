import { Request, Response, NextFunction } from 'express';
import { isRevoked } from '../../../packages/auth/src/session-revocation.js';
import { logger } from '../lib/logger.js';

/**
 * Middleware to check if a session JWT has been revoked
 * Should be called after JWT verification
 */
export async function verifyRevocation(req: Request, res: Response, next: NextFunction) {
  try {
    const session = (req as any).auth;

    if (!session || !session.jti) {
      // No session to check
      return next();
    }

    // Check if session is revoked
    const revoked = await isRevoked(session.jti);

    if (revoked) {
      logger.warn({ jti: session.jti }, 'Revoked token used');
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
