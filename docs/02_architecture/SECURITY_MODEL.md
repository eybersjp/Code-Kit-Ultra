# Security Model — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**See also:** `docs/02_architecture/AUTH_ARCHITECTURE.md`, `docs/04_tracking/risk-log.md`, `docs/06_validation/SECURITY_AUDIT.md`

---

## Threat Surface

Code Kit Ultra's threat surface spans four zones:

| Zone | Threat Classes | Primary Mitigations |
|------|---------------|---------------------|
| **Identity & Auth** | Token forgery, replay, escalation, cross-tenant | JWKS verification, tenant scope checks, revocation |
| **Execution** | Command injection, path traversal, sandbox escape | Adapter allowlists, simulation gate, execution tokens |
| **Data** | Audit tampering, data exfiltration, injection | Hash chain, immutable audit table, parameterised queries |
| **Infrastructure** | Secret leakage, misconfigured exposure, container escape | Env var enforcement, least-privilege containers, no hardcoded creds |

---

## Security Control Catalogue

### SC-01 — JWT Signature Verification

All bearer tokens are cryptographically verified before any business logic executes.

- **InsForge JWTs:** RS256, JWKS endpoint (public key fetched, cached 10 min)
- **Service Account JWTs:** HS256, `SERVICE_ACCOUNT_JWT_SECRET` env var
- **Execution tokens:** HS256, `EXECUTION_TOKEN_SECRET` env var
- **Failure mode:** 401 Unauthorized — never partial auth

**Status:** ✅ Implemented

---

### SC-02 — Token Expiry Enforcement

Every JWT carries an `exp` claim. The `exp` is checked on every authenticated request before any other processing.

- InsForge tokens: typically 1 hour (InsForge-controlled)
- Service account tokens: 30 days (configurable)
- Execution tokens: 10 minutes (hardcoded minimum)

**Status:** ✅ Implemented

---

### SC-03 — Session Revocation

Compromised tokens can be invalidated before natural expiry via a Redis-backed jti blocklist.

- Key format: `revoked:<jti>` with TTL = remaining token lifetime
- In-memory fallback for dev (lost on restart)
- `POST /v1/session/revoke` — self-revocation
- `POST /v1/session/revoke-all` — admin revocation of all sessions for a user

**Status:** 🔲 Spec ready (`SPEC_SESSION_REVOCATION.md`), not yet wired

---

### SC-04 — Multi-Tenant Isolation

Every API request is validated for tenant scope. The actor's resolved `orgId/workspaceId/projectId` must match the requested resource's tenant.

- Enforced in `authorize.ts` middleware
- Cross-tenant requests → 403 Forbidden
- All DB queries include `organization_id` or `project_id` in WHERE clauses

**Known gap (R-02):** A `tenant.orgId === 'default'` bypass exists in `authorize.ts` that skips the tenant check for legacy development flows. This must be removed before production.

**Status:** ⚠️ Partially implemented — bypass bug open

---

### SC-05 — Command Allowlist

Terminal commands are restricted to an operator-configured allowlist (`config/policy.json`). Commands not in the allowlist receive `riskLevel: 'critical'` from simulation.

In `god` mode, non-allowlisted commands may still execute after operator confirmation. In all other modes, they are blocked.

**Status:** ✅ Implemented

---

### SC-06 — Execution Token Scoping

Adapters receive short-lived (10 min), run-scoped execution tokens rather than the user's long-lived session token. This limits credential exposure during adapter execution.

- Execution tokens cannot create runs or approve gates
- Execution tokens are never logged
- Execution tokens are never stored beyond the current request

**Status:** ✅ Implemented

---

### SC-07 — Simulation Before Execution

Every ProviderAdapter action is simulated before execution. Simulation produces a risk level and explanation. High and critical risk actions pause execution in all non-god modes.

This prevents blind execution of destructive operations and creates an approval gate for high-impact actions.

**Status:** ✅ Implemented

---

### SC-08 — Immutable Audit Log

Audit events have no update or delete path. The `audit_events` table has no UPDATE or DELETE grants in the schema. The SHA256 hash chain provides tamper detection.

**Known gap (R-09):** Hash chain `lastHash` is module-level state, not persisted across restarts or shared across replicas. Must be initialised from DB on startup and use an advisory lock.

**Status:** ⚠️ Partially implemented — hash chain not restart-safe

---

### SC-09 — No Hardcoded Secrets in Production

All secrets must be provided via environment variables. The application must throw a startup error if required secrets are absent.

**Known gaps:**
- `packages/auth/src/service-account.ts` has a hardcoded fallback secret (`'dev-secret-change-me'`) used when `SERVICE_ACCOUNT_JWT_SECRET` is absent (R-01)
- `packages/core/src/auth.ts` contains hardcoded API keys for legacy development (R-03)

**Status:** ⚠️ Partially implemented — hardcoded fallbacks exist

**Required fix:**
```typescript
// DO THIS — throw on missing secret:
const secret = process.env.SERVICE_ACCOUNT_JWT_SECRET;
if (!secret) throw new Error('SERVICE_ACCOUNT_JWT_SECRET is required');

// NOT THIS — never fall back to a hardcoded value:
const secret = process.env.SERVICE_ACCOUNT_JWT_SECRET ?? 'dev-secret-change-me';
```

---

### SC-10 — RBAC Permission Enforcement

Every route that modifies data requires a specific permission. The `authorize()` middleware checks `req.auth.permissions` before handler execution.

Permission matrix: see `AUTH_ARCHITECTURE.md` and `packages/policy/src/role-mapping.ts`.

**Status:** ✅ Implemented

---

### SC-11 — Parameterised Queries

All PostgreSQL queries use parameterised statements (`$1`, `$2`, etc.) via the `pg` driver. No string concatenation in SQL.

**Status:** ✅ Implemented (where DB is connected; see R-04 for connection status)

---

### SC-12 — Service Account Persistence

Service accounts are currently stored in an in-memory Map. This means:
- SAs are lost on restart
- SAs are not shared across replicas
- SA secrets cannot be properly rotated

DB persistence is required before production. See `SPEC_SERVICE_ACCOUNTS.md`.

**Status:** 🔲 Not implemented (R-01)

---

### SC-13 — Web UI Session Storage

The web control plane (`apps/web-control-plane`) stores the session token in `localStorage`. This is vulnerable to XSS.

**Required:** Move session token to `httpOnly`, `Secure`, `SameSite=Strict` cookie set by the control service.

**Status:** 🔲 Not implemented (R-10)

---

### SC-14 — VS Code Extension Token Cache

The VS Code extension stores the session token in `context.globalState` (VSCode's key-value store). Tokens with `expiresAt` are evicted on load.

**Known bug (R-11):** `expiresAt` is stored as seconds since epoch but compared against `Date.now()` (milliseconds). Tokens are never considered expired. Fix: compare `expiresAt * 1000 < Date.now()`.

**Status:** ⚠️ Bug open

---

## Incident Classification

| Class | Description | Examples | Response |
|-------|-------------|---------|----------|
| **P0 — Critical** | Active exploitation, data breach, auth bypass | Cross-tenant data access, token forgery | Immediate incident response, revoke all sessions, audit review |
| **P1 — High** | Known exploitable vulnerability, no active exploitation | Hardcoded secret in prod, missing tenant check | Fix within 24 hours, deploy hotfix |
| **P2 — Medium** | Security gap without immediate exploitability | localStorage session storage, hash chain restart bug | Fix within current sprint |
| **P3 — Low** | Best-practice gaps, defence-in-depth improvements | Missing rate limiting, no security headers | Backlog, address before v2.0 |

---

## Open Security Risks (Summary)

Full detail in `docs/04_tracking/risk-log.md` and `docs/06_validation/SECURITY_AUDIT.md`.

| Risk ID | Description | Severity | SC Reference |
|---------|-------------|---------|-------------|
| R-01 | Hardcoded service account fallback secret | 🔴 Critical | SC-09 |
| R-02 | `default` org tenant isolation bypass | 🔴 Critical | SC-04 |
| R-03 | Hardcoded API keys in packages/core | 🔴 Critical | SC-09 |
| R-04 | PostgreSQL not wired to runtime | 🟠 High | — |
| R-05 | Service accounts lost on restart (in-memory) | 🟠 High | SC-12 |
| R-06 | Session revocation not wired | 🟠 High | SC-03 |
| R-09 | Audit hash chain not restart-safe | 🟡 Medium | SC-08 |
| R-10 | Web UI stores token in localStorage | 🟡 Medium | SC-13 |
| R-11 | VS Code extension `expiresAt` unit bug | 🟡 Medium | SC-14 |

---

## Security Requirements for v1.3.0 Release

Before v1.3.0 ships, the following controls must be complete and verified:

- [ ] SC-03: Session revocation wired and tested
- [ ] SC-04: Tenant bypass removed, all cross-tenant tests passing
- [ ] SC-09: All hardcoded secrets removed; startup throws on missing required env vars
- [ ] SC-12: Service accounts persisted to DB
- [ ] R-09: Hash chain initialised from DB on startup
- [ ] Penetration test of authentication flows completed
- [ ] All P0 and P1 risks closed

Any open P0 risk is a **hard no-go** for release.
