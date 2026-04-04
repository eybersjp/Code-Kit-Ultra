import redis from 'redis';
import { logger } from '../../apps/control-service/src/lib/logger.js';

let redisClient: redis.RedisClient | null = null;

/**
 * Initialize Redis client for session revocation
 */
export async function initializeRevocationStore(): Promise<void> {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set; session revocation disabled');
    return;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    await redisClient.connect();
    logger.info('Redis client connected for session revocation');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Redis for revocation');
    throw err;
  }
}

/**
 * Revoke a session JWT by its jti claim
 * @param jti - JWT jti claim
 * @param expiresIn - Seconds until token naturally expires
 */
export async function revokeSession(jti: string, expiresIn: number): Promise<void> {
  if (!redisClient) {
    logger.warn('Redis client not initialized; revocation skipped');
    return;
  }

  try {
    await redisClient.setEx(`revoked:${jti}`, expiresIn, '1');
    logger.debug({ jti, expiresIn }, 'Session revoked');
  } catch (err) {
    logger.error({ err, jti }, 'Failed to revoke session');
    throw err;
  }
}

/**
 * Check if a session JWT is revoked
 * @param jti - JWT jti claim
 * @returns true if revoked, false otherwise
 */
export async function isRevoked(jti: string): Promise<boolean> {
  if (!redisClient) {
    // If Redis is not available, we cannot revoke tokens
    logger.warn('Redis client not initialized; assuming token is not revoked');
    return false;
  }

  try {
    const result = await redisClient.exists(`revoked:${jti}`);
    return result === 1;
  } catch (err) {
    logger.error({ err, jti }, 'Failed to check revocation status');
    // On error, fail safely by assuming token is revoked
    return true;
  }
}

/**
 * Close Redis connection
 */
export async function closeRevocationStore(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.disconnect();
      logger.info('Redis client disconnected');
    } catch (err) {
      logger.error({ err }, 'Error closing Redis connection');
    }
  }
}
