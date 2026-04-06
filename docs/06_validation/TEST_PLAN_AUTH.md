# Test Plan — Auth and Session

**Version**: 1.0.0
**Date**: 2026-04-04
**Status**: Active
**Owner**: Platform Security
**Related packages**: `packages/auth`

---

## Table of Contents

1. [Scope](#1-scope)
2. [Test Cases — InsForge Token Verification](#2-test-cases--insforge-token-verification)
3. [Test Cases — Session Resolution](#3-test-cases--session-resolution)
4. [Test Cases — Execution Token](#4-test-cases--execution-token)
5. [Test Cases — Service Account](#5-test-cases--service-account)
6. [Mock Requirements](#6-mock-requirements)
7. [Test File Locations](#7-test-file-locations)
8. [Example Test Code](#8-example-test-code)

---

## 1. Scope

This test plan covers the four source files that form the auth package's public surface:

| Source file | Exported symbols | Risk level |
|---|---|---|
| `packages/auth/src/verify-insforge-token.ts` | `verifyInsForgeToken` | Critical |
| `packages/auth/src/resolve-session.ts` | `resolveInsForgeSession`, `mapClaimsToSession` | Critical |
| `packages/auth/src/issue-execution-token.ts` | `issueExecutionToken` | High |
| `packages/auth/src/service-account.ts` | `ServiceAccountAuth` | High |

The existing tests in `verify-insforge-token.test.ts` and `resolve-session.test.ts` cover the happy
path and basic error cases. This plan documents the full set of cases required to reach the ≥ 90%
coverage target and satisfy the security requirements in `TEST_STRATEGY.md`.

Out of scope: HTTP middleware, rate limiting, refresh token rotation. Those are tested in
`apps/control-service/test/session.test.ts`.

---

## 2. Test Cases — InsForge Token Verification

**File**: `packages/auth/src/verify-insforge-token.test.ts`
**Function under test**: `verifyInsForgeToken(token: string): Promise<Record<string, unknown>>`

### Existing Coverage (do not duplicate)

- Valid RS256 JWT returns decoded claims. (PASS)
- Invalid signature rejects with error message. (PASS)
- Expired token rejects with error message. (PASS)
- Missing env config rejects with configuration error. (PASS)

### Missing Test Cases

#### TC-AUTH-001: Wrong issuer throws descriptive error

```
Given: a valid RS256 JWT whose `iss` claim is "https://evil.example.com"
When: verifyInsForgeToken is called
Then: throws an error containing "InsForge token verification failed"
```

Rationale: issuer mismatch is the primary defence against token replay from a foreign IdP.

#### TC-AUTH-002: Wrong audience throws descriptive error

```
Given: a valid RS256 JWT whose `aud` claim is "other-service"
When: verifyInsForgeToken is called with INSFORGE_JWT_AUDIENCE="cku-api"
Then: throws an error containing "InsForge token verification failed"
```

#### TC-AUTH-003: JWKS key fetch failure triggers retry then throws

```
Given: the JWKS endpoint returns HTTP 503 on every attempt
When: verifyInsForgeToken is called
Then:
  - the JWKS client is called at least twice (retry behaviour)
  - the promise rejects with an error indicating JWKS unavailability
```

#### TC-AUTH-004: JWKS key fetch succeeds on second attempt (transient failure)

```
Given: the JWKS endpoint returns HTTP 503 on attempt 1 and HTTP 200 on attempt 2
When: verifyInsForgeToken is called
Then: the promise resolves with the decoded claims (no error thrown)
```

#### TC-AUTH-005: Token with unknown `kid` throws

```
Given: a JWT signed with a key whose `kid` is not present in the JWKS response
When: verifyInsForgeToken is called
Then: throws an error (key not found in JWKS)
```

#### TC-AUTH-006: Revoked token (jti in Redis blacklist) throws

```
Given: a structurally valid, unexpired JWT
And: the token's `jti` claim is present in the Redis revocation set
When: verifyInsForgeToken is called (with revocation check enabled)
Then: throws an error indicating the token has been revoked
Note: this test requires a Redis mock (see Section 6)
```

#### TC-AUTH-007: Token with no `jti` claim is accepted (revocation check skipped)

```
Given: a structurally valid JWT with no `jti` claim
And: the revocation store is empty
When: verifyInsForgeToken is called
Then: resolves successfully with decoded claims
```

---

## 3. Test Cases — Session Resolution

**File**: `packages/auth/src/resolve-session.test.ts`
**Functions under test**: `resolveInsForgeSession`, `mapClaimsToSession`

### Existing Coverage (do not duplicate)

- `mapClaimsToSession`: valid full claims → correct `ResolvedSession` shape. (PASS)
- `mapClaimsToSession`: minimal claims → default `viewer` role, `default-org`. (PASS)
- `resolveInsForgeSession`: delegates to `verifyInsForgeToken` and maps correctly. (PASS)

### Missing Test Cases

#### TC-SESSION-001: Service account JWT returns `service_account` actor type

```
Given: a token whose decoded payload contains `type: "service_account"`
When: resolveSession(token) is called (the unified resolver)
Then: the returned ResolvedSession has actor.actorType === "service_account"
```

#### TC-SESSION-002: Legacy API key header returns `legacy_api_key` actor type

```
Given: an Authorization header value of "ApiKey sk-live-abc123"
When: resolveSession is called with this header
Then: returns a ResolvedSession with actor.actorType === "legacy_api_key"
And: actor.roles defaults to ["viewer"] unless the API key record grants more
```

#### TC-SESSION-003: Missing Authorization header throws UnauthorizedError

```
Given: no Authorization header (undefined or empty string)
When: resolveSession is called
Then: throws an error with a message suitable for a 401 response
```

#### TC-SESSION-004: Malformed bearer token throws MalformedTokenError

```
Given: Authorization header value of "Bearer not.a.jwt"
When: resolveSession is called
Then: throws an error indicating the token is malformed (not a valid JWT structure)
Note: must NOT leak the raw token value in the error message
```

#### TC-SESSION-005: Claims with multiple roles accumulate all permissions

```
Given: claims with roles: ["operator", "reviewer"]
When: mapClaimsToSession is called
Then: session.actor.roles contains both "operator" and "reviewer"
```

#### TC-SESSION-006: Role alias normalisation

```
Given: claims with roles: ["Owner", "Reviewer"]  (InsForge capitalised aliases)
When: mapClaimsToSession is called
Then: session.actor.roles resolves to ["admin", "reviewer"] after alias normalisation
```

---

## 4. Test Cases — Execution Token

**File**: `packages/auth/src/issue-execution-token.test.ts` (to be created)
**Function under test**: `issueExecutionToken(scope: ExecutionScope): Promise<string>`

All test cases in this section are new (no existing coverage).

#### TC-EXEC-001: Issued token is a valid HS256 JWT

```
Given: a valid ExecutionScope with runId, orgId, workspaceId, projectId, actorId
And: INSFORGE_SERVICE_ROLE_KEY is set
When: issueExecutionToken(scope) is called
Then:
  - the returned string is a three-part JWT (header.payload.signature)
  - jwt.decode(token).header.alg === "HS256"
```

#### TC-EXEC-002: Token payload contains all scope fields

```
Given: scope = { runId: "run-001", tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" }, actor: { actorId: "user-1", ... }, correlationId: "corr-1" }
When: issueExecutionToken(scope) is called
Then: decoded token payload includes:
  - sub === "user-1"
  - run_id === "run-001"
  - org_id === "org-1"
  - workspace_id === "ws-1"
  - project_id === "proj-1"
  - correlation_id === "corr-1"
```

#### TC-EXEC-003: Token expires in exactly 10 minutes

```
Given: current time is T
When: issueExecutionToken(scope) is called
Then: decoded token exp ≈ T + 600 seconds (within a 5-second tolerance)
```

```typescript
it("should expire the execution token after 10 minutes", async () => {
  const before = Math.floor(Date.now() / 1000);
  const token = await issueExecutionToken(testScope);
  const decoded = jwt.decode(token) as any;
  const after = Math.floor(Date.now() / 1000);

  expect(decoded.exp).toBeGreaterThanOrEqual(before + 600);
  expect(decoded.exp).toBeLessThanOrEqual(after + 600 + 5);
});
```

#### TC-EXEC-004: Token is rejected if verified with wrong secret

```
Given: a token issued with secret "correct-secret"
When: jwt.verify is called with "wrong-secret"
Then: throws JsonWebTokenError (invalid signature)
```

#### TC-EXEC-005: Missing INSFORGE_SERVICE_ROLE_KEY throws configuration error

```
Given: INSFORGE_SERVICE_ROLE_KEY is not set in process.env
When: issueExecutionToken(scope) is called
Then: throws an error containing "Internal execution token foundation"
```

#### TC-EXEC-006: Token audience is scoped to execution-engine-worker

```
Given: a valid scope
When: issueExecutionToken(scope) is called
Then: decoded token aud === "execution-engine-worker"
```

---

## 5. Test Cases — Service Account

**File**: `packages/auth/src/service-account.test.ts` (to be created)
**Class under test**: `ServiceAccountAuth`

#### TC-SA-001: issueToken returns a decodable JWT with correct payload

```
Given: a ServiceAccount object with id, name, orgId, workspaceId, roles
When: ServiceAccountAuth.issueToken(sa) is called
Then:
  - returns a non-empty string
  - jwt.decode(token).sub === sa.id
  - jwt.decode(token).type === "service_account"
  - jwt.decode(token).orgId === sa.orgId
  - jwt.decode(token).roles deep-equals sa.roles
```

#### TC-SA-002: issueToken with custom expiry is reflected in exp claim

```
Given: ServiceAccountAuth.issueToken(sa, "1h")
When: the token is decoded
Then: token.exp ≈ now + 3600 (within 5-second tolerance)
```

#### TC-SA-003: verifyToken with valid SA token returns ResolvedSession

```
Given: a token issued by issueToken for a SA with roles: ["operator"]
When: ServiceAccountAuth.verifyToken(token) is called
Then:
  - returns a ResolvedSession where actor.actorType === "service_account"
  - actor.roles deep-equals ["operator"]
  - tenant.orgId === sa.orgId
  - tenant.workspaceId === sa.workspaceId
```

#### TC-SA-004: verifyToken with expired token throws

```
Given: a token issued with expiresIn: "1ms" (immediately expired)
When: ServiceAccountAuth.verifyToken(token) is called after a brief delay
Then: throws an error containing "Service Account verification failed"
```

#### TC-SA-005: verifyToken with a non-SA token (user JWT) throws

```
Given: a standard user JWT that does NOT contain type: "service_account"
When: ServiceAccountAuth.verifyToken(token) is called
Then: throws "Invalid token type: Not a service account token"
```

#### TC-SA-006: isServiceAccountToken correctly identifies SA tokens

```
Given: a token with type: "service_account" in payload
When: ServiceAccountAuth.isServiceAccountToken(token)
Then: returns true

Given: a token with no type field
When: ServiceAccountAuth.isServiceAccountToken(token)
Then: returns false
```

#### TC-SA-007: Secret rotation — old token rejected after secret change (integration)

```
Given: a token issued with OLD_SECRET
And: CKU_SERVICE_ACCOUNT_SECRET env var is changed to NEW_SECRET
When: ServiceAccountAuth.verifyToken(old_token) is called
Then: throws (invalid signature with new secret)

And: a new token issued with NEW_SECRET
When: ServiceAccountAuth.verifyToken(new_token) is called
Then: resolves successfully
```

---

## 6. Mock Requirements

### JWKS Mock

The JWKS mock must be started in `vitest.config.ts` `globalSetup` and torn down in `globalTeardown`.

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./tests/setup/jwks-server.ts"],
    env: {
      INSFORGE_JWKS_URL: "http://localhost:9999/.well-known/jwks.json",
    },
  },
});
```

Individual tests that need to simulate JWKS failures should use `vi.mock("jwks-rsa")` to override
the module-level client, as demonstrated in the existing `verify-insforge-token.test.ts`.

### Redis Mock (for jti revocation — TC-AUTH-006)

Use `ioredis-mock` or `vi.mock` the Redis client module. The mock must support:
- `SADD key value` — add a jti to the revocation set.
- `SISMEMBER key value` — check if a jti is revoked.

```typescript
vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    sadd: vi.fn(),
    sismember: vi.fn().mockResolvedValue(1), // 1 = member exists (revoked)
  })),
}));
```

---

## 7. Test File Locations

| File | Status | Notes |
|---|---|---|
| `packages/auth/src/verify-insforge-token.test.ts` | Exists — extend with TC-AUTH-001 through TC-AUTH-007 | |
| `packages/auth/src/resolve-session.test.ts` | Exists — extend with TC-SESSION-001 through TC-SESSION-006 | |
| `packages/auth/src/issue-execution-token.test.ts` | To be created | TC-EXEC-001 through TC-EXEC-006 |
| `packages/auth/src/service-account.test.ts` | To be created | TC-SA-001 through TC-SA-007 |
| `packages/auth/test/session-revocation.test.ts` | To be created | Integration test; requires Redis mock |

---

## 8. Example Test Code

### issue-execution-token.test.ts (skeleton)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { issueExecutionToken } from "./issue-execution-token";
import type { ExecutionScope } from "../../shared/src/types";

const TEST_SECRET = "test-service-role-key-must-be-32-chars";

const testScope: ExecutionScope = {
  runId: "run-tc-001",
  tenant: { orgId: "org-001", workspaceId: "ws-001", projectId: "proj-001" },
  actor: { actorId: "user-001", actorType: "user", actorName: "Test User", roles: ["operator"] },
  correlationId: "corr-001",
};

describe("issueExecutionToken", () => {
  beforeEach(() => {
    process.env.INSFORGE_SERVICE_ROLE_KEY = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.INSFORGE_SERVICE_ROLE_KEY;
  });

  it("should return a valid HS256 JWT containing all scope fields", async () => {
    const token = await issueExecutionToken(testScope);
    const decoded = jwt.decode(token) as Record<string, unknown>;

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    expect(decoded.sub).toBe("user-001");
    expect(decoded.run_id).toBe("run-tc-001");
    expect(decoded.org_id).toBe("org-001");
    expect(decoded.workspace_id).toBe("ws-001");
    expect(decoded.project_id).toBe("proj-001");
    expect(decoded.correlation_id).toBe("corr-001");
  });

  it("should expire the token after 10 minutes", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await issueExecutionToken(testScope);
    const decoded = jwt.decode(token) as any;

    expect(decoded.exp).toBeGreaterThanOrEqual(before + 600);
    expect(decoded.exp).toBeLessThanOrEqual(before + 605);
  });

  it("should throw when INSFORGE_SERVICE_ROLE_KEY is not configured", async () => {
    delete process.env.INSFORGE_SERVICE_ROLE_KEY;
    await expect(issueExecutionToken(testScope)).rejects.toThrow(
      "Internal execution token foundation"
    );
  });

  it("should be rejected when verified with the wrong secret", async () => {
    const token = await issueExecutionToken(testScope);
    expect(() => jwt.verify(token, "wrong-secret")).toThrow();
  });
});
```

### service-account.test.ts (skeleton)

```typescript
import { describe, it, expect } from "vitest";
import { ServiceAccountAuth, type ServiceAccount } from "./service-account";

const testSA: ServiceAccount = {
  id: "sa-001",
  name: "CI Bot",
  orgId: "org-001",
  workspaceId: "ws-001",
  roles: ["operator"],
};

describe("ServiceAccountAuth", () => {
  describe("issueToken", () => {
    it("should return a JWT with service_account type claim", () => {
      const token = ServiceAccountAuth.issueToken(testSA);
      const decoded = require("jsonwebtoken").decode(token) as any;
      expect(decoded.type).toBe("service_account");
      expect(decoded.sub).toBe("sa-001");
    });
  });

  describe("verifyToken", () => {
    it("should return a ResolvedSession with service_account actor type", async () => {
      const token = ServiceAccountAuth.issueToken(testSA);
      const session = await ServiceAccountAuth.verifyToken(token);
      expect(session.actor.actorType).toBe("service_account");
      expect(session.actor.roles).toEqual(["operator"]);
      expect(session.tenant.orgId).toBe("org-001");
    });

    it("should throw when the token does not have service_account type", async () => {
      // A plain JWT without the type field
      const plain = require("jsonwebtoken").sign({ sub: "user-1" }, "test-secret");
      // Override the secret env for this test
      const oldSecret = process.env.CKU_SERVICE_ACCOUNT_SECRET;
      process.env.CKU_SERVICE_ACCOUNT_SECRET = "test-secret";

      await expect(ServiceAccountAuth.verifyToken(plain)).rejects.toThrow(
        "Invalid token type: Not a service account token"
      );
      process.env.CKU_SERVICE_ACCOUNT_SECRET = oldSecret;
    });
  });

  describe("isServiceAccountToken", () => {
    it("should return true for a token with type: service_account", () => {
      const token = ServiceAccountAuth.issueToken(testSA);
      expect(ServiceAccountAuth.isServiceAccountToken(token)).toBe(true);
    });

    it("should return false for a token without the type field", () => {
      const token = require("jsonwebtoken").sign({ sub: "user-1" }, "any-secret");
      expect(ServiceAccountAuth.isServiceAccountToken(token)).toBe(false);
    });
  });
});
```
