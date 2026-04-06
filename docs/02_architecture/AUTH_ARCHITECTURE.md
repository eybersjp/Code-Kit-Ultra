# Auth Architecture — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**See also:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`, `docs/03_specs/SPEC_SERVICE_ACCOUNTS.md`, `docs/03_specs/SPEC_SESSION_REVOCATION.md`

---

## Identity Plane Separation

Code Kit Ultra does **not** issue or own human identity. Human session identity is delegated entirely to InsForge (the identity plane). Code Kit Ultra:

- Verifies tokens issued by InsForge
- Issues its own short-lived execution tokens for adapter use
- Issues service account JWTs for machine-to-machine flows

```
┌─────────────────┐     Sign-in     ┌─────────────────┐
│  Operator       │────────────────▶│  InsForge        │
│  (human)        │◀────────────────│  (identity plane)│
│                 │   Bearer JWT     │                  │
└────────┬────────┘                 └─────────────────┘
         │ Bearer <insforge-jwt>
         ▼
┌─────────────────┐
│  Control Service│  authenticate.ts verifies signature via JWKS endpoint
│  authenticate.ts│  Normalises to req.auth (actor, tenant, permissions)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │  Receives resolved scope — never raw tokens
│                 │  Issues short-lived execution token for adapters
└─────────────────┘
```

---

## Authentication Strategies

The `authenticate.ts` middleware supports three bearer token strategies, evaluated in order:

### Strategy 1 — InsForge Session JWT (Primary)

Tokens issued by InsForge's Supabase Auth backend. RS256-signed. Verified against InsForge's JWKS endpoint.

```
Authorization: Bearer <insforge-jwt>
```

**Verification steps:**
1. Fetch JWKS from `INSFORGE_JWKS_URI` (cached with 10-minute TTL)
2. Verify RS256 signature
3. Check `iss` matches `INSFORGE_ISSUER`
4. Check `exp` not expired
5. Check `jti` not in revocation list (Redis or in-memory fallback)
6. Extract `sub` → `actorId`, `aud` → `orgId/workspaceId/projectId`

**Resulting `req.auth`:**
```typescript
{
  actor: { id: sub, type: 'human' },
  tenant: { orgId, workspaceId, projectId },
  permissions: resolvePermissions(claims.role),
  authMode: 'session',
  correlationId: claims.jti ?? generateCorrelationId(),
  claims: { jti, exp, sub, role, ... }
}
```

### Strategy 2 — Service Account JWT

Short-lived JWTs issued by Code Kit Ultra's own `issueServiceAccountToken()` function. HS256-signed with `SERVICE_ACCOUNT_JWT_SECRET`.

```
Authorization: Bearer <service-account-jwt>
```

**Verification steps:**
1. Detect `iss === 'cku-service-account'`
2. Verify HS256 signature with `SERVICE_ACCOUNT_JWT_SECRET`
3. Check `exp` not expired
4. Resolve service account record (DB lookup by `sub`)
5. Validate scopes against requested operation

**Resulting `req.auth`:**
```typescript
{
  actor: { id: sub, type: 'service-account' },
  tenant: { orgId, workspaceId: saRecord.workspaceId, projectId: saRecord.projectId },
  permissions: scopesToPermissions(claims.scopes),
  authMode: 'service-account',
  correlationId: claims.jti ?? generateCorrelationId(),
  claims: { jti, exp, sub, scopes, ... }
}
```

### Strategy 3 — Legacy API Key (Deprecated)

Static API keys for local development only. Resolved against hardcoded map in `packages/core/src/auth.ts`.

```
Authorization: Bearer ck_dev_*
```

> **Warning:** This strategy must be disabled in production. Set `LEGACY_API_KEYS_ENABLED=false` to reject. All new flows must use Strategy 1 or 2.

---

## Session Resolution Flow

```typescript
// packages/auth/src/resolve-session.ts

export async function resolveSession(token: string): Promise<ResolvedSession> {
  // 1. Detect token type by prefix or claim inspection
  const tokenType = detectTokenType(token);

  if (tokenType === 'insforge-jwt') {
    const claims = await verifyInsForgeJWT(token);
    return normaliseInsForgeSession(claims);
  }

  if (tokenType === 'service-account-jwt') {
    const claims = verifyServiceAccountJWT(token);
    const sa = await db.serviceAccounts.findById(claims.sub);
    return normaliseServiceAccountSession(claims, sa);
  }

  if (tokenType === 'legacy-api-key') {
    if (!config.legacyApiKeysEnabled) throw new AuthError('Legacy API keys disabled');
    return normaliseLegacyKeySession(token);
  }

  throw new AuthError('Unrecognised token format');
}
```

---

## RBAC Permission Model

### Roles and Permissions

```typescript
// packages/policy/src/role-mapping.ts

type Role = 'admin' | 'developer' | 'viewer' | 'service-account';

type Permission =
  | 'run:create' | 'run:read' | 'run:cancel'
  | 'gate:approve' | 'gate:reject' | 'gate:read'
  | 'audit:read'
  | 'service-account:manage'
  | 'workspace:manage';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'run:create', 'run:read', 'run:cancel',
    'gate:approve', 'gate:reject', 'gate:read',
    'audit:read',
    'service-account:manage',
    'workspace:manage',
  ],
  developer: [
    'run:create', 'run:read', 'run:cancel',
    'gate:approve', 'gate:reject', 'gate:read',
  ],
  viewer: ['run:read', 'gate:read', 'audit:read'],
  'service-account': [],  // Derived from token scopes
};
```

### Tenant Scope Enforcement

The `authorize.ts` middleware enforces that the resolved tenant in `req.auth` matches the requested resource's tenant. Cross-tenant access is rejected at this layer.

```typescript
// apps/control-service/src/middleware/authorize.ts

export function authorize(requiredPermission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { permissions, tenant } = req.auth!;

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Tenant scope check
    const requestedProjectId = req.params.projectId ?? req.body.projectId;
    if (requestedProjectId && tenant.projectId !== requestedProjectId) {
      // NOTE: The 'default' org bypass is a known vulnerability — see risk-log R-02
      return res.status(403).json({ error: 'Cross-tenant access denied' });
    }

    next();
  };
}
```

> **Known Issue (R-02):** The current implementation contains a `tenant.orgId === 'default'` bypass that skips tenant scope validation. This must be removed. See `docs/04_tracking/risk-log.md`.

---

## Service Account Lifecycle

```
1. Admin calls: POST /v1/service-accounts
   Body: { name, workspaceId, projectId, scopes: ['run:create', 'gate:read'] }

2. Control service:
   → Validates scopes against allowed scope set
   → Generates id: sa_<uuid>
   → Inserts into service_accounts DB table
   → Returns { id, name, scopes }

3. Admin generates token:
   POST /v1/service-accounts/{id}/tokens
   → Returns signed JWT (HS256, exp: configurable, default 30 days)
   → Token stored nowhere — admin responsibility to store

4. Automation uses token:
   Authorization: Bearer <sa-jwt>
   → authenticate.ts detects iss === 'cku-service-account'
   → DB lookup confirms account active
   → Permissions derived from scopes in token

5. Rotation:
   POST /v1/service-accounts/{id}/rotate
   → Invalidates all existing tokens (jti revocation or new secret generation)
   → Issues new token
```

> **Known Issue (R-01):** Service accounts currently stored in in-memory Map. DB persistence is a Phase 3 requirement. See `SPEC_SERVICE_ACCOUNTS.md`.

---

## Execution Token Issuance

When the orchestrator needs to pass credentials to adapters, it does not forward the user's session token. Instead, it calls `issueExecutionToken()`:

```typescript
// packages/auth/src/issue-execution-token.ts

export function issueExecutionToken(scope: ExecutionTokenScope): string {
  return jwt.sign(
    {
      sub: scope.actorId,
      runId: scope.runId,
      orgId: scope.orgId,
      projectId: scope.projectId,
      scopes: ['run:execute'],
      iss: 'cku-execution',
    },
    config.executionTokenSecret,
    { algorithm: 'HS256', expiresIn: '10m' }
  );
}
```

**Properties:**
- 10-minute TTL — expires before any reasonable run completes its current phase
- Scoped to `run:execute` only — cannot create new runs or approve gates
- Bound to specific `runId` — adapters may verify this claim
- Never logged or persisted

---

## Session Revocation

Revocation is implemented via Redis (with in-memory fallback for dev). See `SPEC_SESSION_REVOCATION.md` for full design.

```
POST /v1/session/revoke
Authorization: Bearer <token-to-revoke>

→ Extracts jti from token claims
→ Writes to Redis: SET revoked:<jti> 1 EX <remaining-ttl>
→ Emits audit event: session.revoked
→ Subsequent requests with same token return 401
```

**Middleware check (every authenticated request):**
```typescript
// After signature verification:
if (claims.jti && await revocationStore.isRevoked(claims.jti)) {
  return res.status(401).json({ error: 'Session has been revoked' });
}
```

**InsForge tokens without `jti`:** Revocation is skipped with a logged warning. Work with InsForge to include `jti` in token issuance.

---

## Token Hierarchy Summary

```
InsForge JWT (human)
  ├── Issued by: InsForge (RS256, JWKS-verified)
  ├── Lifetime: Configured by InsForge (typically 1 hour)
  ├── Carries: sub, role, org/workspace/project claims
  └── Revocable: Yes (if jti present)

Service Account JWT
  ├── Issued by: Control Service (HS256)
  ├── Lifetime: Configurable (default 30 days)
  ├── Carries: sub, scopes, orgId
  └── Revocable: Via jti blacklist or account deactivation

Execution Token
  ├── Issued by: Orchestrator (HS256)
  ├── Lifetime: 10 minutes
  ├── Carries: runId, orgId, projectId, scopes: [run:execute]
  └── Revocable: Not required (short TTL sufficient)

Legacy API Key (deprecated)
  ├── Issued by: Hardcoded in packages/core/src/auth.ts
  ├── Lifetime: Infinite (no expiry)
  └── Revocable: Only by code change — DO NOT use in production
```

---

## Security Controls Summary

| Control | Implementation | Status |
|---------|---------------|--------|
| JWT signature verification | JWKS (RS256) for InsForge, HS256 for SA/execution | ✅ Implemented |
| Token expiry enforcement | `exp` claim checked on every request | ✅ Implemented |
| Session revocation | Redis jti blacklist | 🔲 Spec ready, not wired |
| Tenant isolation | authorize.ts scope check | ⚠️ Bypass bug open (R-02) |
| Service account persistence | DB table defined | 🔲 In-memory only (R-01) |
| Legacy key disable flag | `LEGACY_API_KEYS_ENABLED` env var | 🔲 Flag exists, not enforced at startup |
| Execution token scoping | 10-min HS256, run-scoped | ✅ Implemented |
| RBAC permission matrix | role-mapping.ts | ✅ Implemented |
