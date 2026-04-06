# SPEC — Session Revocation

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/AUTH_ARCHITECTURE.md`
**Implements:** Master spec Section 8 — Authentication, Security Controls
**Risk refs:** R-13

---

## Objective

Implement a session revocation mechanism so compromised bearer tokens can be invalidated immediately, before their natural expiry. The revocation check must happen on every authenticated request with minimal latency overhead.

---

## Scope

**In scope:**
- Session revocation list stored in Redis (with DB fallback for dev without Redis)
- `POST /v1/session/revoke` endpoint (revoke own session)
- `POST /v1/session/revoke-all` endpoint (admin: revoke all sessions for a user)
- Revocation check in authenticate middleware
- TTL-based automatic cleanup of expired revocation entries

**Out of scope:**
- Bulk revocation across all users (requires separate admin tooling)
- Token family tracking (future enhancement)

---

## Design

### Revocation Storage

```typescript
// Redis key format: revoked:<jti>  (JWT ID claim)
// TTL: token remaining lifetime (so entry auto-expires when token would anyway)

async function revokeToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.setex(`revoked:${jti}`, ttlSeconds, '1');
}

async function isRevoked(jti: string): Promise<boolean> {
  const result = await redis.get(`revoked:${jti}`);
  return result === '1';
}
```

### Authenticate Middleware Update

```typescript
// After verifying JWT signature and claims:
const jti = claims.jti;
if (jti && await isRevoked(jti)) {
  return res.status(401).json({ error: 'Session has been revoked' });
}
```

### Revoke Endpoint

```
POST /v1/session/revoke
Authorization: Bearer <token>

HTTP/1.1 200 OK
{ "message": "Session revoked successfully" }
```

```typescript
router.post('/session/revoke', authenticate, async (req, res) => {
  const { jti, exp } = req.auth!.claims;
  if (!jti) return res.status(400).json({ error: 'Token does not contain a jti claim' });

  const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
  await revokeToken(jti, ttl);

  writeAuditEvent({
    eventType: 'session.revoked',
    actor: req.auth!.actor,
    tenant: req.auth!.tenant,
    authMode: req.auth!.authMode,
    correlationId: req.auth!.correlationId,
    payload: { jti },
  });

  res.json({ message: 'Session revoked successfully' });
});
```

---

## InsForge Token Consideration

InsForge JWTs may not include a `jti` claim. If no `jti` is present:
- Revocation is not supported for that token type
- Log a warning and skip revocation check
- Work with InsForge to include `jti` in token issuance

---

## Dev Fallback (No Redis)

```typescript
// In-process Set as fallback (lost on restart, sufficient for dev):
const inMemoryRevocationSet = new Set<string>();

async function isRevoked(jti: string): Promise<boolean> {
  if (redis) return (await redis.get(`revoked:${jti}`)) === '1';
  return inMemoryRevocationSet.has(jti);
}
```

---

## Definition of Done

- [ ] `POST /v1/session/revoke` immediately invalidates token for subsequent requests
- [ ] Revoked token returns 401 on next authenticated request
- [ ] Revocation entries auto-expire when token would expire naturally
- [ ] Dev fallback works without Redis (in-memory with warning)
- [ ] Audit event emitted on revocation
- [ ] `jti` absence handled gracefully with log warning
- [ ] Logged in `progress-log.md`
