import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 5],
  registers: [register],
});

// Run counters
export const runCreatedTotal = new client.Counter({
  name: 'run_created_total',
  help: 'Total runs created',
  registers: [register],
});

export const runCompletedTotal = new client.Counter({
  name: 'run_completed_total',
  help: 'Total runs completed successfully',
  registers: [register],
});

export const runFailedTotal = new client.Counter({
  name: 'run_failed_total',
  help: 'Total runs that failed',
  registers: [register],
});

// Gate evaluation counter
export const gateEvaluationsTotal = new client.Counter({
  name: 'gate_evaluations_total',
  help: 'Total gate evaluations',
  labelNames: ['gate', 'result'],
  registers: [register],
});

// Request metrics middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route }, duration);
  });

  next();
}

// GET /metrics handler
export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
