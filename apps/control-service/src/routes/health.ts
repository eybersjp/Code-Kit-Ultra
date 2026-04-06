import { Router, Request, Response } from 'express';
import { getPool, testConnection } from '../db/pool.js';
import redis from 'redis';
import { logger } from '../lib/logger.js';

const router = Router();

// GET /health - Liveness probe (never depends on DB)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.3.0',
    timestamp: new Date().toISOString(),
  });
});

// GET /ready - Readiness probe (depends on DB and Redis)
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, boolean> = {};

  try {
    // Check database
    checks.database = await testConnection();
  } catch (err) {
    logger.error({ err }, 'Database check failed');
    checks.database = false;
  }

  try {
    // Check Redis (if REDIS_URL is set)
    if (process.env.REDIS_URL) {
      const redisClient = redis.createClient({
        url: process.env.REDIS_URL,
      });
      redisClient.on('error', () => {
        checks.redis = false;
      });
      await redisClient.connect();
      await redisClient.ping();
      await redisClient.disconnect();
      checks.redis = true;
    } else {
      checks.redis = true; // Skip if not configured
    }
  } catch (err) {
    logger.error({ err }, 'Redis check failed');
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every((v) => v);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
