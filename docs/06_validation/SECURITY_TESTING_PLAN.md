# Security Testing Plan

- **Document type**: Security Test Plan
- **Version target**: v1.3.0
- **Last updated**: 2026-04-04
- **Status**: Draft — Phase 1 required before v1.3.0 release

---

## 1. Scope

### In scope

| System | What is tested |
|--------|---------------|
| `apps/control-service` API | All authenticated endpoints, rate limiting, input validation |
| `packages/auth` | JWT validation, session resolution, token revocation |
| Tenant isolation layer | Cross-org access prevention, run scoping |
| SSE realtime stream (`GET /v1/stream`) | Cross-tenant event leakage |
| Audit log subsystem | Hash chain integrity, restart safety |

### Out of scope

- InsForge platform internals (JWT issuance, JWKS endpoint) — not operated by this team
- Third-party AI provider APIs (OpenAI, Anthropic, etc.)
- Network-layer controls (TLS termination, DDoS mitigation) — handled by infrastructure
- Client-side / browser security of any frontend applications

---

## 2. Testing Phases

### Phase 1 — Pre-release (required for v1.3.0)

| Activity | Owner | Timing |
|----------|-------|--------|
| Manual security review of open risks R-01 through R-07 | Security Lead | 2 weeks before release |
| Automated security test suite (`pnpm test:security`) | Engineering | CI, every PR to main |
| OWASP ZAP API scan against staging | Security Lead | 1 week before release |
| `npm audit` dependency vulnerability scan | Engineering | CI, weekly |
| Static analysis: `eslint-plugin-security` | Engineering | CI, every PR |

**Exit criteria for Phase 1:** Zero High or Critical findings from ZAP; all automated
security tests pass; all P0/P1 risks from the open risk register resolved.

### Phase 2 — Post-release (scheduled)

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Automated `npm audit` | Weekly (CI cron) | Engineering |
| OWASP ZAP scan against production (read-only, non-destructive) | Monthly | Security Lead |
| Dependency update review | Monthly | Engineering |

### Phase 3 — Ongoing (CI enforcement)

- All tests in `pnpm test:security` run on every PR to `main`.
- Any PR that removes or skips a security test requires Security Lead approval.
- New security bug fixes must be accompanied by a regression test before merge.

---

## 3. Test Cases by Category

All automated test cases live under `packages/auth/tests/security/` and
`apps/control-service/tests/security/`. Run with:

```bash
pnpm test:security
```

---

### 3.1 Authentication Attacks

**JWT algorithm confusion**
- Send a token signed with HS256 using the RS256 public key as the HMAC secret.
  Server expects RS256 (from JWKS). Must reject with `401 INVALID_TOKEN`.

**JWT "none" algorithm**
- Craft a token with header `{"alg":"none","typ":"JWT"}` and no signature.
  Must reject with `401 INVALID_TOKEN` — server must never accept `alg: "none"`.

**Expired token**
- Issue a valid RS256 token with `exp` set 1 hour in the past.
  Must reject with `401 TOKEN_EXPIRED`.

**Wrong issuer**
- Issue a token with `iss: "https://evil.example.com"` signed with a valid key.
  Must reject with `401 INVALID_ISSUER`.

**Tampered payload**
- Take a valid token, decode the payload, flip one character in `sub`, re-encode
  with the original signature (now invalid).
  Must reject with `401 INVALID_SIGNATURE`.

**Revoked token (jti blacklist)**
- Issue a valid token. Call the logout endpoint to revoke it (adds jti to Redis
  blacklist). Immediately reuse the same token on a protected endpoint.
  Must reject with `401 TOKEN_REVOKED`.

**Brute force rate limit**
- Send 11 login/token-creation requests within 60 seconds from the same actor.
  The 11th request must receive `429 Too Many Requests` with a `Retry-After`
  header.

```typescript
describe('Authentication Attacks', () => {
  it('rejects HS256 algorithm confusion token', async () => {
    const token = buildAlgConfusionToken({ alg: 'HS256', secret: RS256_PUBLIC_KEY });
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects alg:none token', async () => {
    const token = buildNoneAlgToken({ sub: 'user-a-admin' });
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const token = buildExpiredToken({ sub: 'user-a-admin', ageSeconds: 3600 });
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects wrong issuer', async () => {
    const token = buildToken({ sub: 'user-a-admin', iss: 'https://evil.example.com' });
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_ISSUER');
  });

  it('rejects tampered payload', async () => {
    const token = buildTamperedPayloadToken({ sub: 'user-a-admin' });
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects revoked token (jti in Redis blacklist)', async () => {
    const { token } = await issueToken({ sub: 'user-a-admin' });
    await api.post('/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    const res = await api.get('/v1/runs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_REVOKED');
  });

  it('rate limits token creation at 11 attempts per minute', async () => {
    for (let i = 0; i < 10; i++) {
      await api.post('/v1/auth/token').send({ clientId: 'x', clientSecret: 'bad' });
    }
    const res = await api.post('/v1/auth/token').send({ clientId: 'x', clientSecret: 'bad' });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
```

---

### 3.2 Authorization Bypass

**Cross-tenant run access**
- Authenticate as an orgA user with a valid token. Request `GET /v1/runs/{id}` where
  `id` belongs to orgB. Must receive `404` — not `200` (leak) or `403` (information
  disclosure that the run exists).

**Gate approval without permission**
- Authenticate as a user without `gate:approve` permission. Call the gate approval
  endpoint. Must receive `403 FORBIDDEN`.

**Privilege escalation via crafted JWT**
- Craft a token with `roles: ["org:admin"]` for an account that is only
  `workspace:member`. Because the token is not signed by InsForge's private key,
  it must be rejected with `401 INVALID_SIGNATURE`.

**Service account accessing admin endpoint**
- Authenticate as a service account (which has `actorType: service_account`).
  Call an admin-only endpoint (e.g., `GET /v1/admin/orgs`).
  Must receive `403 FORBIDDEN`.

**Forged execution token**
- Issue an execution token for run-a1. Substitute run-a2's ID into the token payload
  without re-signing. Call `POST /v1/runs/run-a2/resume` with this token.
  Must receive `401 INVALID_EXEC_TOKEN`.

```typescript
describe('Authorization Bypass', () => {
  it('returns 404 (not 200 or 403) for cross-tenant run access', async () => {
    const res = await authed(orgAToken).get('/v1/runs/run-b1');
    expect(res.status).toBe(404);
  });

  it('returns 403 for gate approval without gate:approve permission', async () => {
    const res = await authed(viewerToken).post(`/v1/runs/run-a1/gates/1/approve`);
    expect(res.status).toBe(403);
  });

  it('rejects crafted admin JWT with invalid signature', async () => {
    const token = craftAdminToken({ sub: 'user-a-member' }); // not signed by InsForge
    const res = await api.get('/v1/admin/orgs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for service account accessing admin endpoint', async () => {
    const res = await authed(saToken).get('/v1/admin/orgs');
    expect(res.status).toBe(403);
  });

  it('rejects forged execution token for different run', async () => {
    const forgedToken = forgeExecToken({ originalRunId: 'run-a1', targetRunId: 'run-a2' });
    const res = await api
      .post('/v1/runs/run-a2/resume')
      .set('X-Execution-Token', forgedToken);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_EXEC_TOKEN');
  });
});
```

---

### 3.3 Input Validation

**SQL injection in runId**
- Send `GET /v1/runs/'; DROP TABLE runs; --` as the run ID path parameter.
  The query must use parameterized statements; the response must be `400` or `404`
  with no DB error. The `runs` table must still exist after the request.

**XSS in idea text**
- Submit `POST /v1/runs` with `idea: "<script>alert(1)</script>"`.
  The stored and returned value must be sanitized or escaped — the literal
  `<script>` tag must not appear unescaped in API responses.

**Oversized payload**
- Submit a `POST /v1/runs` request with a 10 MB `idea` field.
  Must receive `413 Entity Too Large` before the payload is processed.

**Malformed JSON**
- Send a `POST /v1/runs` request with body `{broken json`.
  Must receive `400 Bad Request` with a parse error message.

**Negative step index**
- Send `PATCH /v1/runs/{id}/step` with `stepIndex: -1`.
  Must receive `400` with a validation error indicating `stepIndex` must be
  a non-negative integer.

```typescript
describe('Input Validation', () => {
  it('handles SQL injection in runId path param without DB error', async () => {
    const res = await authed(orgAToken).get("/v1/runs/'; DROP TABLE runs; --");
    expect([400, 404]).toContain(res.status);
    // Verify runs table still exists
    const check = await authed(orgAToken).get('/v1/runs');
    expect(check.status).toBe(200);
  });

  it('sanitizes XSS in idea text', async () => {
    const res = await authed(orgAToken)
      .post('/v1/runs')
      .send({ orgId: 'org-a', workspaceId: 'ws-1', idea: '<script>alert(1)</script>' });
    expect(res.status).toBe(201);
    expect(res.body.run.idea).not.toMatch(/<script>/i);
  });

  it('returns 413 for oversized payload', async () => {
    const res = await authed(orgAToken)
      .post('/v1/runs')
      .send({ orgId: 'org-a', workspaceId: 'ws-1', idea: 'x'.repeat(10 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await api
      .post('/v1/runs')
      .set('Authorization', `Bearer ${orgAToken}`)
      .set('Content-Type', 'application/json')
      .send('{broken json');
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative stepIndex', async () => {
    const res = await authed(orgAToken)
      .patch('/v1/runs/run-a1/step')
      .send({ stepIndex: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stepIndex/i);
  });
});
```

---

### 3.4 Tenant Isolation

**Valid orgA token with orgB runId in path**
- Must return `404` with no body content that reveals the run exists in orgB.

**Run enumeration via pagination**
- Exhaust all pages of `GET /v1/runs` as an orgA user; assert zero orgB runs appear
  across all pages regardless of page size.

**SSE stream cross-tenant event leak**
- Connect to `GET /v1/stream` as an orgA user. Trigger an orgB run state change.
  Assert that no event with `orgId: "org-b"` is received on the orgA connection.

**Cross-tenant audit log query**
- Call `GET /v1/audit` as an orgA admin. Assert that every event in the response
  has `orgId: "org-a"`.

```typescript
describe('Tenant Isolation', () => {
  it('returns 404 for valid orgA token + orgB runId', async () => {
    const res = await authed(orgAToken).get('/v1/runs/run-b1');
    expect(res.status).toBe(404);
  });

  it('does not leak orgB runs through pagination', async () => {
    const allRuns: Run[] = [];
    let page = 1, hasMore = true;
    while (hasMore) {
      const res = await authed(orgAToken).get(`/v1/runs?page=${page}&limit=50`);
      allRuns.push(...res.body.runs);
      hasMore = res.body.hasNextPage;
      page++;
    }
    expect(allRuns.every((r) => r.orgId === 'org-a')).toBe(true);
  });

  it('SSE stream delivers no orgB events to orgA subscriber', async () => {
    const received: SSEEvent[] = [];
    const stream = connectSSE('/v1/stream', orgAToken);
    stream.on('event', (e: SSEEvent) => received.push(e));

    await authed(orgBToken).post('/v1/runs').send({ idea: 'b event', orgId: 'org-b' });
    await wait(300);
    stream.close();

    expect(received.filter((e) => e.orgId === 'org-b')).toHaveLength(0);
  });

  it('audit log returns only orgA events for orgA admin', async () => {
    const res = await authed(orgAToken).get('/v1/audit');
    expect(res.status).toBe(200);
    expect(res.body.events.every((e: AuditEvent) => e.orgId === 'org-a')).toBe(true);
  });
});
```

---

### 3.5 Rate Limiting

**Global actor rate limit**
- Send 101 requests within 60 seconds from the same actor.
  The 101st request must return `429 Too Many Requests` with a `Retry-After` header.
  After 60 seconds the limit must reset and the 102nd request must succeed.

**Token creation endpoint rate limit**
- Send 11 token creation attempts within 60 seconds.
  The 11th attempt must return `429`.

```typescript
describe('Rate Limiting', () => {
  it('returns 429 on 101st request in same minute', async () => {
    for (let i = 0; i < 100; i++) {
      await authed(orgAToken).get('/v1/runs');
    }
    const res = await authed(orgAToken).get('/v1/runs');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('returns 429 on 11th token creation attempt in same minute', async () => {
    for (let i = 0; i < 10; i++) {
      await api.post('/v1/auth/token').send({ clientId: 'x', clientSecret: 'bad' });
    }
    const res = await api.post('/v1/auth/token').send({ clientId: 'x', clientSecret: 'bad' });
    expect(res.status).toBe(429);
  });

  it('rate limit resets after 60 seconds', async () => {
    // This test uses fake timers to avoid real 60s wait
    vi.useFakeTimers();
    // ... exhaust limit, advance clock by 61s, verify next request succeeds
    vi.useRealTimers();
  });
});
```

---

### 3.6 Audit Integrity

**Hash chain end-to-end validity**
- POST 100 audit events in sequence. Retrieve the full chain and verify each
  entry's `hash` equals `SHA256(previousHash + eventPayload)`. The chain must be
  valid from entry 1 to entry 100.

**Hash chain survives service restart (R-05)**
- POST 50 events. Restart the control service. POST 10 more events. Run the chain
  verifier across all 60 entries. No mismatch must be detected. This confirms that
  `lastHash` is loaded from DB on startup, not initialized to a static value.

**Tampered entry detection**
- POST 20 events. Directly UPDATE one row in `audit_log` to change its payload.
  Run the chain verifier. Must report a mismatch at the modified entry.

```typescript
describe('Audit Integrity', () => {
  it('SHA256 hash chain is valid across 100 events', async () => {
    await postAuditEvents(100);
    const valid = await verifyAuditChain();
    expect(valid.ok).toBe(true);
    expect(valid.invalidAt).toBeNull();
  });

  it('hash chain continues correctly after service restart (R-05)', async () => {
    await postAuditEvents(50);
    await restartService(); // helper stops and restarts the control-service process
    await postAuditEvents(10);
    const valid = await verifyAuditChain();
    expect(valid.ok).toBe(true);
  });

  it('chain verifier detects a tampered audit entry', async () => {
    await postAuditEvents(20);
    await db.query("UPDATE audit_log SET payload = 'tampered' WHERE sequence = 10");
    const valid = await verifyAuditChain();
    expect(valid.ok).toBe(false);
    expect(valid.invalidAt).toBe(10);
  });
});
```

---

## 4. Tools

| Tool | Purpose | When run |
|------|---------|----------|
| Vitest security suite (`pnpm test:security`) | Automated execution of all cases in §3 | CI on every PR to `main` |
| `npm audit` | Known vulnerability scanning of all dependencies | CI weekly cron + before each release |
| OWASP ZAP (API scan mode) | Active scanning of staging API for OWASP Top 10 | Manual, pre-release (Phase 1) and monthly (Phase 2) |
| `eslint-plugin-security` | Static analysis for common JS/TS security anti-patterns | CI on every PR |
| Manual code review | Review of auth, session, and tenant-resolution code paths | Security Lead review before Gate 1 sign-off |

---

## 5. Pass Criteria

| Criterion | Requirement | Gate |
|-----------|-------------|------|
| All P0 (Critical) issues resolved | Zero open P0 security risks | Gate 1 — HARD BLOCK |
| All P1 (High) issues resolved | Zero open P1 security risks (R-03, R-04, R-05) | Gate 1 — HARD BLOCK |
| Automated security tests | `pnpm test:security` passes with zero failures | Gate 2 — HARD BLOCK |
| OWASP ZAP scan | Zero High or Critical findings in pre-release scan | Gate 1 — HARD BLOCK |
| `npm audit` | Zero High or Critical dependency vulnerabilities | Gate 2 — HARD BLOCK |

Any finding that cannot be resolved before the release date must be documented
with an accepted risk sign-off from the Security Lead. P0/P1 findings cannot
be accepted-risk deferred — they block release unconditionally.

---

## 6. Regression Testing

- All test cases in §3 are part of the `pnpm test:security` suite and run on
  every PR to `main`.
- Any security bug fix must include a new test case that would have caught the
  bug. The test is written first (red), then the fix is applied (green).
- Security tests may not be skipped (`it.skip`) or excluded from coverage without
  an issue reference and Security Lead approval recorded in the PR.
- The security suite is isolated from the main test suite so it can be run
  independently in time-sensitive CI pipelines.

---

## 7. Responsible Disclosure

For reporting vulnerabilities discovered in Code-Kit-Ultra, refer to
`docs/SECURITY.md` (or `SECURITY.md` at the repository root). That document
contains the contact address, expected response timeline, and disclosure
embargo policy.

Vulnerabilities found during internal testing are tracked in the private security
issue tracker referenced in `SECURITY.md`. Do not open public issues for
unpatched security vulnerabilities.

---

## Related Documents

- `docs/06_validation/GO_NO_GO_CHECKLIST.md` — release gate (Gate 1 references this plan)
- `docs/06_validation/PRODUCTION_READINESS.md` — full readiness checklist (S-01 through S-10)
- `docs/06_validation/TEST_PLAN_RUN_SCOPING.md` — tenant isolation test plan
- `docs/06_validation/TEST_PLAN_AUTH.md` — auth package unit test plan
- `docs/SECURITY_AUDIT.md` — open risk register (R-01 through R-08)
