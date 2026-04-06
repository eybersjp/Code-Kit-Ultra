# SPEC — API Versioning

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 9 — Control-Service API Specification
**Unblocks:** T1-2 implementation
**Risk refs:** R-05

---

## Objective

All HTTP routes on the control-service must be prefixed with `/v1/` to enable forward-compatible versioning. Existing routes must be moved under this prefix without breaking backwards-compatible clients during a transition window.

---

## Scope

**In scope:**
- All protected API routes (runs, gates, session, audit, healing, service-accounts, events)
- OpenAPI documentation prefix alignment
- Client-side API base URL updates (web control plane, VS Code extension, CLI)

**Out of scope:**
- `/health` — remains at root level for infrastructure probes
- `/metrics` — remains at root level for Prometheus scraping
- WebSocket or SSE connection handling (covered in `SPEC_REALTIME_STREAM.md`)

---

## Route Catalog

| Method | Versioned Path | Purpose | Permission |
|--------|---------------|---------|------------|
| GET | `/v1/session` | Return actor, tenant, memberships, permissions, authMode | Authenticated |
| POST | `/v1/runs` | Create a run | `run:create` + project scope |
| GET | `/v1/runs` | List visible runs | `run:view` |
| GET | `/v1/runs/:runId` | Run detail and timeline | `run:view` + scoped |
| POST | `/v1/runs/:runId/resume` | Resume paused run | `run:create` |
| POST | `/v1/runs/:runId/rollback` | Trigger rollback | `execution:rollback` |
| POST | `/v1/runs/:runId/healing` | Invoke healing flow | `healing:invoke` |
| POST | `/v1/gates/:gateId/approve` | Approve a gate | `gate:approve` |
| POST | `/v1/gates/:gateId}/reject` | Reject a gate | `gate:reject` |
| GET | `/v1/audit` | Query audit records | `audit:view` |
| GET | `/v1/events/stream` | SSE event subscription | Authenticated |
| GET | `/v1/service-accounts` | List service accounts | `service_account:view` |
| POST | `/v1/service-accounts` | Create service account | `service_account:manage` |
| DELETE | `/v1/service-accounts/:id` | Delete service account | `service_account:manage` |

**Infra routes (NOT versioned):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health probe |
| GET | `/metrics` | Prometheus scrape |

---

## Implementation

### 1. Route restructuring — `apps/control-service/src/index.ts`

```typescript
import { Router } from 'express';

const v1Router = Router();

// Mount all protected routes on v1Router
v1Router.get('/session', authenticate, getSession);
v1Router.post('/runs', authenticate, requirePermission('run:create'), createRun);
v1Router.get('/runs', authenticate, requirePermission('run:view'), listRuns);
// ... all other routes

// Mount v1 router
app.use('/v1', v1Router);

// Infra routes at root
app.get('/health', healthHandler);
app.get('/metrics', metricsHandler);
```

### 2. Client updates

**Web control plane** — `apps/web-control-plane/src/lib/api.ts`:
```typescript
const client = axios.create({
  baseURL: '/api/v1',  // was: '/api'
});
```

**VS Code extension** — `extensions/code-kit-vscode/src/api/client.ts`:
```typescript
const BASE_URL = config.get('baseUrl', 'http://localhost:4000') + '/v1';
```

**CLI** — `apps/cli/src/index.ts`:
Update all hardcoded API paths to include `/v1/`.

### 3. Transition window (optional)

If a backward-compatibility grace period is required, mount legacy routes with deprecation headers:
```typescript
app.use('/runs', (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</v1/runs>; rel="successor-version"');
  next();
}, v1Router);
```
Remove after all clients are updated.

---

## Error Handling Contract

| Code | Condition |
|------|-----------|
| 401 | Missing or invalid authentication |
| 403 | Valid identity, insufficient permission or scope |
| 404 | Resource not found (no enumeration leakage) |
| 409 | Invalid state transition (e.g. approving an already-decided gate) |
| 422 | Invalid request payload (invalid mode value, missing required fields) |
| 500 | Internal error (after audit and event hooks have captured the failure) |

---

## Dependencies

- None — this is a foundational change; all other specs depend on this being done first.

---

## Edge Cases

- Clients using hardcoded `/runs` without `/v1/` prefix must be updated before transition window closes
- Health checks from Kubernetes and load balancers must NOT be moved to `/v1/`
- CI/CD tests that call API endpoints directly must be updated to use `/v1/`

---

## Risks

- **Breaking change for existing clients** — mitigated by transition window with deprecation headers
- **Missing route in v1Router** — mitigated by ensuring all routes are registered before removing legacy mounts

---

## Definition of Done

- [ ] All protected routes return 200/expected responses at `/v1/*` paths
- [ ] `GET /health` returns 200 at root (not at `/v1/health`)
- [ ] Web control plane, extension, and CLI all use `/v1/` prefixed paths
- [ ] Existing routes return 301 or 410 with deprecation headers
- [ ] CI tests updated to call `/v1/*` endpoints
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
