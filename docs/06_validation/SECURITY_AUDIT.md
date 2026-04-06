# Security Audit — Code Kit Ultra

**Status:** Active
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**Purpose:** Authoritative record of all identified security risks, remediation status, and verification plan. Derived from risk-log.md with detailed remediation guidance.

---

## Risk Summary

| Severity | Count | Blocked? | Notes |
|----------|-------|----------|-------|
| 🔴 Critical (P0) | 3 | **YES** | v1.3.0 release blocked until all closed |
| 🟠 High (P1) | 5 | **YES** | Must fix before ship |
| 🟡 Medium (P2) | 10 | No | Current sprint |
| 🟢 Low (P3) | 4 | No | Backlog for v2.0 |
| **Total** | **22** | — | — |

---

## Critical Risks (P0)

Any open P0 risk is an **automatic no-go** for v1.3.0 release.

### R-01: Hardcoded Service Account JWT Secret Fallback

**Severity:** 🔴 Critical
**File:** `packages/auth/src/service-account.ts`
**Lines:** ~42

**Description:**
Service account JWT signing uses a hardcoded fallback secret when `SERVICE_ACCOUNT_JWT_SECRET` env var is absent:
```typescript
const secret = process.env.SERVICE_ACCOUNT_JWT_SECRET ?? 'dev-secret-change-me';
```

**Blast Radius:**
- If prod build lacks env var, tokens are signed with a public hardcoded value
- Anyone with source code can forge service account JWTs
- Cross-tenant privilege escalation is trivial
- Undetected until runtime

**Root Cause:**
Development convenience. The hardcoded fallback was never removed.

**Remediation:**
```typescript
// INSTEAD:
const secret = process.env.SERVICE_ACCOUNT_JWT_SECRET;
if (!secret) {
  throw new Error(
    'FATAL: SERVICE_ACCOUNT_JWT_SECRET must be set in environment. ' +
    'See ops-guide.md for generation instructions.'
  );
}
```

**Verification:**
1. Code review: no fallback present in production paths
2. Integration test: app throws on missing `SERVICE_ACCOUNT_JWT_SECRET`
3. Production deploy: `SERVICE_ACCOUNT_JWT_SECRET` present in secrets manager before deploy

**Status:** 🔴 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0 alpha

---

### R-02: Default Org Tenant Isolation Bypass

**Severity:** 🔴 Critical
**File:** `apps/control-service/src/middleware/authorize.ts`
**Lines:** ~35–40

**Description:**
The tenant scope check includes a bypass for orgs with id `'default'`:
```typescript
if (tenant.orgId === 'default') {
  // Skip tenant validation for legacy flows
  next();
  return;
}
// Check tenant matches...
```

**Blast Radius:**
- Any actor claiming `orgId: 'default'` bypasses all tenant checks
- Attacker can read/modify runs and gates for any project
- Affects all downstream authorization (gate:approve, run:create)
- Silent escalation — no audit trail

**Root Cause:**
Legacy development convenience. Never removed before merge.

**Remediation:**
1. Delete the `if (tenant.orgId === 'default')` block entirely
2. Add a feature flag if development bypass is genuinely needed (e.g., `TENANT_CHECK_ENABLED`)
3. Default flag to `true` (check enabled)

```typescript
if (config.tenantCheckEnabled && tenant.orgId !== requestedOrgId) {
  return res.status(403).json({ error: 'Cross-tenant access denied' });
}
```

**Verification:**
1. Code review: no orgId-based bypass exists
2. Integration test: request with `orgId: 'default'` still rejects cross-tenant access
3. Prod deploy: feature flag defaults to `true` (checks always on)

**Status:** 🔴 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0 alpha

---

### R-03: Hardcoded API Keys in Production Code

**Severity:** 🔴 Critical
**File:** `packages/core/src/auth.ts`
**Lines:** ~12–25

**Description:**
Legacy API key validation uses hardcoded keys:
```typescript
const HARDCODED_KEYS = {
  'ck_dev_alice': 'alice-secret',
  'ck_dev_bob': 'bob-secret',
};
```

**Blast Radius:**
- Anyone reading source code can impersonate any dev user
- Legacy keys are documented in README/examples
- If prod build includes this file, unprivileged users can gain admin access
- Cross-tenant escalation via `default` org bypass (R-02)

**Root Cause:**
Development convenience. Legacy auth system never fully removed.

**Remediation:**
1. Delete `packages/core/src/auth.ts` entirely (replaced by InsForge + service accounts)
2. OR: Move to `packages/auth/__mocks__/legacy-auth.test.ts` for test use only
3. Verify no imports remain outside of test files

```bash
# Audit for remaining imports:
grep -r "from.*packages/core.*auth" apps/ packages/ extensions/ --include="*.ts"
# Should return: Only test imports
```

**Verification:**
1. Code review: no hardcoded keys in any source file
2. Grep the prod build artifact — zero matches for `ck_dev_`
3. Integration test with legacy key returns 401

**Status:** 🔴 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0 alpha

---

## High-Priority Risks (P1)

P1 risks must be fixed before v1.3.0, but blocking release is discretionary.

### R-04: PostgreSQL Not Wired to Runtime

**Severity:** 🟠 High
**File:** `apps/control-service/src/index.ts` (missing initialization)
**Impact:** All persistent state is lost on restart; audit is not durable

**Description:**
The application has a PostgreSQL schema defined (`db/schema.sql`) but the database client is never initialised at startup. Runtime state goes to:
- Service accounts → in-memory Map (R-05)
- Audit events → console.log (not queryable)
- Gate decisions → in-memory Map
- Runs → in-memory Map

**Blast Radius:**
- SLA: no data durability — critical for audit compliance
- Audit trail unauditable (console logs not searchable)
- Multi-instance deployment impossible (state not shared)
- Recovery after outage → data loss

**Remediation:**
1. Wire DB client pool in `apps/control-service/src/index.ts`:
   ```typescript
   const db = await initializeDatabase();
   app.locals.db = db;
   ```
2. Run migrations on startup
3. Implement CRUD modules for each table
4. Update all handlers to use DB instead of in-memory stores

See `docs/03_specs/SPEC_POSTGRES_PERSISTENCE.md` for full implementation design.

**Verification:**
1. Control service starts and logs "Database connection pool initialised"
2. Migrations run without error
3. A run created in service A is readable from service B (multi-instance test)
4. Service restart does not lose runs, gates, or audit events

**Status:** 🟠 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0

---

### R-05: Service Accounts Lost on Restart

**Severity:** 🟠 High
**File:** `apps/control-service/src/routes/service-accounts.ts`

**Description:**
Service accounts are stored in an in-memory JavaScript Map:
```typescript
const serviceAccountStore = new Map<string, ServiceAccount>();
```

On restart, the Map is empty.

**Blast Radius:**
- Automation using service account tokens breaks after restart
- Operators have no way to track which SAs exist
- Token rotation impossible (no SA record to revoke old tokens)
- No audit trail of SA creation

**Remediation:**
Persist service accounts to `service_accounts` table. See `docs/03_specs/SPEC_SERVICE_ACCOUNTS.md`.

**Verification:**
1. Create a service account
2. Restart control service
3. Service account still present (DB query returns it)
4. Token issued after restart is still valid

**Status:** 🟠 Open (Blocked by R-04)
**Assigned to:** TBD
**Target fix date:** Before v1.3.0

---

### R-06: Session Revocation Not Wired

**Severity:** 🟠 High
**File:** Missing: `apps/control-service/src/routes/session.ts`

**Description:**
The spec for session revocation (`docs/03_specs/SPEC_SESSION_REVOCATION.md`) is complete, but:
- `POST /v1/session/revoke` endpoint does not exist
- Redis revocation store is not checked in authenticate.ts
- Tokens remain valid until natural expiry

**Blast Radius:**
- Compromised tokens cannot be invalidated (attacker keeps access)
- No incident response path for token leaks
- Compliance gap: "revoke on logout" requirement cannot be met

**Remediation:**
1. Implement `POST /v1/session/revoke` endpoint (see SPEC_SESSION_REVOCATION.md)
2. Check revocation store in authenticate.ts middleware
3. Wire Redis client (dev fallback: in-memory with warning)

**Verification:**
1. Issue bearer token
2. POST to /v1/session/revoke with that token
3. Next authenticated request with same token returns 401
4. Audit event "session.revoked" is logged

**Status:** 🟠 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0

---

### R-07: Missing Governance Gate Taxonomy Implementation

**Severity:** 🟠 High
**File:** `packages/orchestrator/src/gate-manager.ts`

**Description:**
The spec defines 9 governance gates. Only 5 quality gates exist in the code:
- ✅ objective-clarity, requirements-completeness, plan-readiness, skill-coverage, ambiguity-risk
- ❌ scope, architecture, build, qa, security, cost, deployment, launch

**Blast Radius:**
- Gates don't enforce governance model
- No way to pause for architecture review, security review, cost approval
- Bypasses all quality controls in non-god modes

**Remediation:**
Implement all 9 gates in gate-manager.ts. See `docs/03_specs/SPEC_GATE_TAXONOMY.md`.

**Verification:**
1. Gate manager includes all 9 governance gates
2. Each gate evaluates correctly per spec
3. Mode-aware pause rules applied
4. Tests: all 14 gates (5 quality + 9 governance) pass

**Status:** 🟠 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0

---

### R-08: CLI Routes Under-versioned

**Severity:** 🟠 High
**File:** `apps/cli/src/index.ts`

**Description:**
CLI commands call unversioned API endpoints:
```typescript
const res = await fetch(`${baseUrl}/runs`, { ... });
```

Should be `/v1/runs`. The spec requires all routes under `/v1/`.

**Blast Radius:**
- API version mismatch (CLI expects old shape, server returns v1)
- No forward compatibility (future v2 API will break CLI)

**Remediation:**
Update all CLI endpoints to `/v1/`. See `docs/03_specs/SPEC_API_VERSIONING.md`.

**Verification:**
1. All CLI calls use `/v1/` prefix
2. CLI routes match `SPEC_API_VERSIONING.md` catalog
3. Unversioned endpoints return 404

**Status:** 🟠 Open
**Assigned to:** TBD
**Target fix date:** Before v1.3.0

---

## Medium-Priority Risks (P2)

Medium risks should be fixed in current sprint but don't block v1.3.0.

### R-09: Audit Hash Chain Not Restart-Safe

**Severity:** 🟡 Medium  
**File:** `packages/audit/src/write-audit-event.ts`

Hash chain uses module-level state:
```typescript
let lastHash = '0'.repeat(64);  // Lost on restart!
```

### R-10: Web UI Session Storage in localStorage

**Severity:** 🟡 Medium  
**File:** `apps/web-control-plane/src/lib/auth.ts`

Tokens stored in `localStorage` are vulnerable to XSS. Move to `httpOnly` cookie.

### R-11: VS Code Extension Token Expiry Unit Bug

**Severity:** 🟡 Medium  
**File:** `extensions/code-kit-vscode/src/auth/sessionClient.ts`

Token `expiresAt` is seconds since epoch but compared against `Date.now()` (milliseconds). Tokens never expire.

### R-12–R-22: Additional Medium and Low Risks

See `docs/04_tracking/risk-log.md` for complete inventory of all 22 risks with remediation guidance.

---

## Security Testing Plan

### Pre-Release Testing (Required)

1. **Authentication Flow** (3 hours)
   - Valid InsForge JWT accepted
   - Expired JWT rejected
   - Tampered JWT rejected
   - Missing JWT returns 401
   - Service account JWT verified
   - Hardcoded API keys rejected (after R-03)

2. **Authorization Flow** (3 hours)
   - Permission enforcement: only admin can create workspace
   - Tenant enforcement: can't read other org's runs
   - Default org bypass removed (after R-02)
   - RBAC matrix matches spec

3. **Data Integrity** (2 hours)
   - Audit events immutable (no updates)
   - Audit hash chain verified
   - Run state persisted across restart

4. **Incident Response** (1 hour)
   - Revoked token returns 401 (after R-06)
   - All secrets from env vars (after R-01, R-03)

### Post-Release Monitoring

- Weekly review of audit logs for anomalies
- Monthly penetration test (external contractor)
- Continuous security scanning in CI (SAST, dependency check)

---

## Release Checklist

Before v1.3.0 ships, the release captain must verify:

- [ ] All P0 (critical) risks closed (R-01, R-02, R-03)
- [ ] All P1 (high) risks closed (R-04 through R-08)
- [ ] Code review: zero matches for hardcoded secrets (grep -r)
- [ ] All blocking tests pass (auth, gate, run, persistence)
- [ ] Security audit approval from infosec team
- [ ] Penetration test passed with no critical findings
- [ ] Incident response playbook documented
- [ ] On-call procedure for security incidents defined

Any unchecked item → release is blocked.
