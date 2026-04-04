import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple in-memory rate limiter (use Redis in production for multi-instance)
const store = new Map<string, RateLimitEntry>();

function getKey(req: Request): string {
  return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

// Clean up expired entries every minute
setInterval(cleanup, 60_000);

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const key = getKey(req);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// Global limiter: 100 req/min per IP
export const globalRateLimiter = createRateLimiter(100, 60_000);

// Strict limiter for token creation: 10 req/min per IP
export const tokenCreationRateLimiter = createRateLimiter(10, 60_000);
