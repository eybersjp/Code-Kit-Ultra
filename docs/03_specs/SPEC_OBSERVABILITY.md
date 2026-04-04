# SPEC — Observability Stack

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 16.3 — Observability Stack
**Unblocks:** T1-5 implementation
**Risk refs:** R-09

---

## Objective

Implement structured JSON logging, Prometheus metrics, and OpenTelemetry distributed tracing across the control-service and orchestration layers. All log entries must carry correlationId, runId, actorId, and projectId. Production operations must be fully observable.

---

## Scope

**In scope:**
- Structured logging with Pino
- Prometheus metrics endpoint (`GET /metrics`)
- OpenTelemetry auto-instrumentation for HTTP and PostgreSQL
- Correlation ID propagation through all request handlers
- Log level configuration via environment variable

**Out of scope:**
- Log aggregation backend (Datadog, Cloud Logging — infrastructure team responsibility)
- Alerting rules and dashboards
- Business metrics in the learning engine (separate future spec)

---

## Logging Design

### Logger Factory — `packages/observability/src/logger.ts`

```typescript
import pino from 'pino';

export interface LogContext {
  correlationId?: string;
  runId?: string;
  actorId?: string;
  projectId?: string;
  orgId?: string;
}

export function createLogger(service: string, ctx?: LogContext) {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    base: {
      service,
      env: process.env.NODE_ENV ?? 'development',
      ...ctx,
    },
  });
}

export const logger = createLogger('control-service');
```

### Request Logger Middleware

```typescript
import pinoHttp from 'pino-http';

export const requestLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    correlationId: req.headers['x-correlation-id'] ?? req.auth?.correlationId,
    actorId: req.auth?.actor?.actorId,
    projectId: req.auth?.tenant?.projectId,
  }),
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
});
```

### Usage Pattern

Replace all `console.log` with:
```typescript
import { logger } from '@cku/observability';

// In handlers:
logger.info({ runId, actorId, gateId }, 'Gate approved');
logger.error({ runId, err: error.message }, 'Gate rejection failed');
logger.warn({ actorId, authMode: 'legacy-api-key' }, 'Deprecated auth mode in use');
```

---

## Metrics Design

### Metrics Registry — `packages/observability/src/metrics.ts`

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Run metrics
export const runCreatedTotal = new Counter({
  name: 'cku_runs_created_total',
  help: 'Total runs created',
  labelNames: ['mode', 'auth_mode'],
  registers: [register],
});

export const runCompletedTotal = new Counter({
  name: 'cku_runs_completed_total',
  help: 'Total runs completed',
  labelNames: ['status'],  // completed | failed | cancelled
  registers: [register],
});

// Gate metrics
export const gateDecisionTotal = new Counter({
  name: 'cku_gate_decisions_total',
  help: 'Gate approval/rejection decisions',
  labelNames: ['gate', 'decision'],  // decision: approved | rejected
  registers: [register],
});

export const gateApprovalLatency = new Histogram({
  name: 'cku_gate_approval_duration_seconds',
  help: 'Time between gate creation and decision',
  labelNames: ['gate'],
  buckets: [60, 300, 900, 3600, 86400],  // 1min, 5min, 15min, 1hr, 1day
  registers: [register],
});

// Adapter metrics
export const adapterExecutionTotal = new Counter({
  name: 'cku_adapter_executions_total',
  help: 'Adapter execution attempts',
  labelNames: ['adapter', 'status'],  // status: success | failure
  registers: [register],
});

// Auth metrics
export const authAttemptTotal = new Counter({
  name: 'cku_auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['mode', 'result'],  // mode: session | service-account | legacy-api-key
  registers: [register],
});

// Active runs
export const activeRunsGauge = new Gauge({
  name: 'cku_active_runs',
  help: 'Currently active (running) runs',
  registers: [register],
});
```

### Metrics Endpoint — `apps/control-service/src/index.ts`

```typescript
import { register } from '@cku/observability/metrics';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Distributed Tracing Design

### Setup — `packages/observability/src/tracing.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function initTracing(serviceName: string) {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  return sdk;
}
```

Auto-instrumented:
- HTTP requests (Express)
- PostgreSQL queries (pg)
- Outbound HTTP calls (axios)

### Initialisation — must be first import in `apps/control-service/src/index.ts`

```typescript
import { initTracing } from '@cku/observability/tracing';
initTracing('cku-control-service');  // Must be before all other imports
```

---

## Environment Variables

```env
LOG_LEVEL=info                              # debug | info | warn | error
OTEL_EXPORTER_OTLP_ENDPOINT=               # OpenTelemetry collector endpoint
OTEL_SERVICE_NAME=cku-control-service
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/observability/src/logger.ts` | Create |
| `packages/observability/src/metrics.ts` | Create |
| `packages/observability/src/tracing.ts` | Create |
| `packages/observability/package.json` | Create |
| `apps/control-service/src/index.ts` | Modify — init tracing first, add /metrics route, add request logger middleware |
| All route handlers | Modify — replace console.log with logger |
| `packages/orchestrator/src/execution-engine.ts` | Modify — add trace spans, increment metrics |

---

## Dependencies

- `pino`, `pino-http` npm packages
- `prom-client` npm package
- `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http` npm packages

---

## Edge Cases

- **Missing OTEL endpoint**: tracing should degrade gracefully, not fail to start
- **High cardinality labels**: never use runId or actorId as a Prometheus label (causes metric explosion)
- **Sensitive data in logs**: mask tokens, secrets, and PII — use `pino.redact` for known paths

---

## Definition of Done

- [ ] All `console.log` in control-service replaced with structured `logger.*` calls
- [ ] All log entries include at minimum: `service`, `level`, `msg`, `correlationId`
- [ ] `GET /metrics` returns Prometheus-formatted metrics
- [ ] All 6 metric types emit correctly under load
- [ ] Distributed traces visible in local Jaeger or OTEL collector
- [ ] Tracing does not crash service when OTEL endpoint unavailable
- [ ] Sensitive fields (tokens, keys) redacted from logs
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
