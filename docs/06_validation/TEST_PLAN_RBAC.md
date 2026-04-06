# Test Plan — RBAC and Permissions

**Version**: 1.0.0
**Date**: 2026-04-04
**Status**: Active
**Owner**: Platform Security
**Related packages**: `packages/policy`, `packages/orchestrator`, `packages/auth`

---

## Table of Contents

1. [Scope](#1-scope)
2. [Permission Matrix](#2-permission-matrix)
3. [Test Cases — Permission Resolution](#3-test-cases--permission-resolution)
4. [Test Cases — Cross-Tenant Isolation](#4-test-cases--cross-tenant-isolation-critical)
5. [Test Cases — Gate Approval Permissions](#5-test-cases--gate-approval-permissions)
6. [Mock Requirements](#6-mock-requirements)
7. [Test File Locations](#7-test-file-locations)
8. [Example Test Code](#8-example-test-code)

---

## 1. Scope

This test plan covers the permission and RBAC subsystem, specifically:

| Source file | Exported symbols | Risk level |
|---|---|---|
| `packages/policy/src/permissions.ts` | `Permission` type | Reference |
| `packages/policy/src/role-mapping.ts` | `ROLE_PERMISSIONS`, `ROLE_ALIASES` | Critical |
| `packages/policy/src/resolve-permissions.ts` | `resolvePermissions` | Critical |

It also covers integration-level tests that validate multi-tenant isolation across the
orchestrator and HTTP layer. These integration tests require a seeded test database.

Out of scope: UI permission rendering, API key scoping, invitation flows.

---

## 2. Permission Matrix

The following matrix defines the expected output of `resolvePermissions` for each role.
Every cell in this matrix must be exercised by at least one test.

| Permission | admin | operator | reviewer | viewer | service_account |
|---|:---:|:---:|:---:|:---:|:---:|
| `run:create` | Y | Y | N | N | Y |
| `run:view` | Y | Y | Y | Y | Y |
| `run:cancel` | Y | Y | N | N | Y |
| `gate:view` | Y | Y | Y | Y | Y |
| `gate:approve` | Y | Y | Y | N | Y |
| `gate:reject` | Y | N | Y | N | N |
| `execution:view` | Y | Y | Y | Y | Y |
| `execution:high_risk` | Y | Y | N | N | Y |
| `execution:rollback` | Y | N | N | N | N |
| `healing:invoke` | Y | Y | N | N | Y |
| `policy:view` | Y | Y | Y | Y | N |
| `policy:manage` | Y | N | N | N | N |
| `audit:view` | Y | N | Y | Y | N |
| `service_account:manage` | Y | N | N | N | N |
| `service_account:view` | Y | N | N | N | N |

Source of truth: `packages/policy/src/role-mapping.ts` → `ROLE_PERMISSIONS`.

---

## 3. Test Cases — Permission Resolution

**File**: `packages/policy/src/resolve-permissions.test.ts` (to be created)
**Function under test**: `resolvePermissions(roles: string[]): Permission[]`

#### TC-RBAC-001: Admin role grants all permissions

```
Given: roles = ["admin"]
When: resolvePermissions(["admin"]) is called
Then: the result includes every permission defined in ROLE_PERMISSIONS.admin
```

#### TC-RBAC-002: Viewer role grants only read permissions

```
Given: roles = ["viewer"]
When: resolvePermissions(["viewer"]) is called
Then:
  - result includes "run:view", "gate:view", "execution:view", "policy:view", "audit:view"
  - result does NOT include "run:create", "run:cancel", "gate:approve", "gate:reject",
    "execution:high_risk", "execution:rollback", "healing:invoke",
    "policy:manage", "service_account:manage", "service_account:view"
```

#### TC-RBAC-003: Operator role cannot reject gates or manage policies

```
Given: roles = ["operator"]
When: resolvePermissions(["operator"]) is called
Then:
  - result includes "run:create", "gate:approve", "execution:high_risk", "healing:invoke"
  - result does NOT include "gate:reject", "policy:manage", "execution:rollback",
    "service_account:manage"
```

#### TC-RBAC-004: Reviewer role can approve and reject gates but cannot create runs

```
Given: roles = ["reviewer"]
When: resolvePermissions(["reviewer"]) is called
Then:
  - result includes "gate:approve", "gate:reject", "audit:view"
  - result does NOT include "run:create", "run:cancel", "execution:high_risk",
    "execution:rollback", "healing:invoke", "policy:manage"
```

#### TC-RBAC-005: Service account role cannot view policy or audit logs

```
Given: roles = ["service_account"]
When: resolvePermissions(["service_account"]) is called
Then:
  - result includes "run:create", "gate:approve", "execution:high_risk", "healing:invoke"
  - result does NOT include "policy:view", "policy:manage", "audit:view",
    "service_account:manage", "gate:reject", "execution:rollback"
```

#### TC-RBAC-006: Multiple roles accumulate permissions (union)

```
Given: roles = ["operator", "reviewer"]
When: resolvePermissions(["operator", "reviewer"]) is called
Then:
  - result includes all permissions from both operator AND reviewer
  - "gate:reject" is included (from reviewer)
  - "run:create" is included (from operator)
  - no permission appears twice in the array
```

#### TC-RBAC-007: Unknown role grants no permissions

```
Given: roles = ["unknown-role"]
When: resolvePermissions(["unknown-role"]) is called
Then: result is an empty array
```

#### TC-RBAC-008: Role alias "Owner" resolves to admin permissions

```
Given: roles = ["Owner"]  (InsForge capitalised alias)
When: resolvePermissions(["Owner"]) is called
Then: result equals resolvePermissions(["admin"])
```

#### TC-RBAC-009: Role alias "ServiceAccount" resolves to service_account permissions

```
Given: roles = ["ServiceAccount"]
When: resolvePermissions(["ServiceAccount"]) is called
Then: result equals resolvePermissions(["service_account"])
```

#### TC-RBAC-010: Empty roles array returns empty permissions

```
Given: roles = []
When: resolvePermissions([]) is called
Then: result is []
```

---

## 4. Test Cases — Cross-Tenant Isolation (CRITICAL)

These tests are labelled `@security` and run on every PR. They require a seeded test database
with two separate orgs (orgA and orgB), each with their own workspaces, projects, runs, and users.

**File**: `packages/policy/test/cross-tenant.test.ts` (to be created)

The integration tests in this section operate through the HTTP layer of `apps/control-service` to
test the full request → permission check → DB query → response chain.

#### TC-CROSS-001: Run owned by orgA is not visible to a user from orgB @security

```
Given:
  - runA belongs to orgA / wsA / projA
  - userB is authenticated to orgB with role "admin"
When: GET /v1/runs/:runAId is called with userB's token
Then:
  - HTTP 404 is returned (not 403)
  - Response body does not contain any data about runA
Note: returning 404 instead of 403 prevents enumeration attacks.
```

#### TC-CROSS-002: Listing runs filters to actor's tenant @security

```
Given:
  - 5 runs exist in orgA
  - 3 runs exist in orgB
  - userB is authenticated to orgB
When: GET /v1/runs is called
Then:
  - Response contains exactly 3 runs (orgB's runs)
  - None of orgA's runIds appear in the response
```

#### TC-CROSS-003: Gate approval by user not in the project is forbidden @security

```
Given:
  - a gate on a run in orgA / projA
  - userB is authenticated to orgB with role "admin"
When: POST /v1/gates/:gateId/approve is called with userB's token
Then: HTTP 404 is returned
```

#### TC-CROSS-004: Service account cannot access runs in a different org @security

```
Given:
  - SA-A is a service account in orgA
  - runB exists in orgB
When: GET /v1/runs/:runBId is called with SA-A's token
Then: HTTP 404 is returned
```

#### TC-CROSS-005: runId from a different org in path param returns 404 @security

```
Given:
  - userA is authenticated to orgA
  - runB.runId is a valid run in orgB
When: GET /v1/runs/:runBId is called with userA's token
Then: HTTP 404 (not 403)
Rationale: 403 would confirm the runId exists; 404 prevents cross-tenant enumeration.
```

#### TC-CROSS-006: Pause run in wrong org returns 404 @security

```
Given: runB is in orgB; userA is authenticated to orgA
When: POST /v1/runs/:runBId/pause is called with userA's token
Then: HTTP 404
```

#### TC-CROSS-007: User in org but not in project cannot access project resources

```
Given:
  - userA is a member of orgA and wsA but NOT projA
  - runP is a run in projA
When: GET /v1/runs/:runPId is called with userA's token
Then: HTTP 404 (project-scoped resource not visible)
```

#### TC-CROSS-008: User with project-level role override gets project permissions

```
Given:
  - userA has role "viewer" at org level
  - userA has role "operator" at projA level (project-level override)
When: POST /v1/runs is called within projA context
Then: HTTP 201 (operator can create runs; org-level viewer cannot)
```

---

## 5. Test Cases — Gate Approval Permissions

**File**: `apps/control-service/test/approvals.test.ts` (already exists — extend)

#### TC-GATE-PERM-001: User with gate:approve permission can approve

```
Given: a pending gate; userA has role "operator" (which grants gate:approve)
When: POST /v1/gates/:gateId/approve is called
Then: HTTP 200; gate status transitions to "pass"
```

#### TC-GATE-PERM-002: User without gate:approve permission gets 403

```
Given: a pending gate; userA has role "viewer" (which does NOT grant gate:approve)
When: POST /v1/gates/:gateId/approve is called
Then: HTTP 403; gate status remains "pending"
```

#### TC-GATE-PERM-003: Only admin and reviewer can reject gates

```
Given: a pending gate; userA has role "operator"
When: POST /v1/gates/:gateId/reject is called
Then: HTTP 403
```

```
Given: a pending gate; userB has role "reviewer"
When: POST /v1/gates/:gateId/reject is called
Then: HTTP 200; gate status transitions to "fail"
```

#### TC-GATE-PERM-004: Approving an already-approved gate returns 409

```
Given: a gate that has already been approved (status: "pass")
When: POST /v1/gates/:gateId/approve is called again
Then: HTTP 409 Conflict
```

#### TC-GATE-PERM-005: Rejecting an already-rejected gate returns 409

```
Given: a gate with status "fail"
When: POST /v1/gates/:gateId/reject is called
Then: HTTP 409 Conflict
```

---

## 6. Mock Requirements

### Test Database Fixtures

The cross-tenant tests require a fully seeded test database. The seed script must create:

```sql
-- Two organisations
INSERT INTO organisations (id, name) VALUES
  ('org-A', 'Org Alpha'),
  ('org-B', 'Org Beta');

-- Three workspaces (2 in orgA, 1 in orgB)
INSERT INTO workspaces (id, org_id, name) VALUES
  ('ws-A1', 'org-A', 'Alpha Workspace 1'),
  ('ws-A2', 'org-A', 'Alpha Workspace 2'),
  ('ws-B1', 'org-B', 'Beta Workspace 1');

-- Five projects
INSERT INTO projects (id, workspace_id, name) VALUES
  ('proj-A1', 'ws-A1', 'Alpha Project 1'),
  ('proj-A2', 'ws-A1', 'Alpha Project 2'),
  ('proj-A3', 'ws-A2', 'Alpha Project 3'),
  ('proj-B1', 'ws-B1', 'Beta Project 1'),
  ('proj-B2', 'ws-B1', 'Beta Project 2');

-- Users with roles
INSERT INTO users (id, name) VALUES
  ('user-admin-A', 'Admin Alpha'),
  ('user-viewer-A', 'Viewer Alpha'),
  ('user-admin-B', 'Admin Beta'),
  ('user-sa-A', 'Service Account Alpha');

INSERT INTO memberships (user_id, org_id, role) VALUES
  ('user-admin-A', 'org-A', 'admin'),
  ('user-viewer-A', 'org-A', 'viewer'),
  ('user-admin-B', 'org-B', 'admin');
```

### Token Factories for Integration Tests

```typescript
// tests/fixtures/token-factory.ts
import jwt from "jsonwebtoken";

const TEST_SECRET = process.env.INSFORGE_SERVICE_ROLE_KEY ?? "test-secret";

export function makeUserToken(userId: string, orgId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, org_id: orgId, actor_type: "user", roles },
    TEST_SECRET,
    { expiresIn: "1h" }
  );
}

export function makeServiceAccountToken(saId: string, orgId: string): string {
  return jwt.sign(
    { sub: saId, orgId, type: "service_account", roles: ["operator"] },
    process.env.CKU_SERVICE_ACCOUNT_SECRET ?? "test-sa-secret",
    { expiresIn: "1h" }
  );
}
```

---

## 7. Test File Locations

| File | Status | Notes |
|---|---|---|
| `packages/policy/src/resolve-permissions.test.ts` | To be created | TC-RBAC-001 through TC-RBAC-010 |
| `packages/policy/test/cross-tenant.test.ts` | To be created | TC-CROSS-001 through TC-CROSS-008; integration |
| `apps/control-service/test/approvals.test.ts` | Exists — extend | TC-GATE-PERM-001 through TC-GATE-PERM-005 |

---

## 8. Example Test Code

### resolve-permissions.test.ts

```typescript
import { describe, it, expect } from "vitest";
import { resolvePermissions } from "./resolve-permissions";

describe("resolvePermissions", () => {
  it("should grant all permissions to admin", () => {
    const perms = resolvePermissions(["admin"]);
    expect(perms).toContain("run:create");
    expect(perms).toContain("gate:reject");
    expect(perms).toContain("policy:manage");
    expect(perms).toContain("service_account:manage");
    expect(perms).toContain("execution:rollback");
  });

  it("should grant only read permissions to viewer", () => {
    const perms = resolvePermissions(["viewer"]);
    expect(perms).toContain("run:view");
    expect(perms).not.toContain("run:create");
    expect(perms).not.toContain("gate:approve");
    expect(perms).not.toContain("execution:rollback");
  });

  it("should accumulate permissions from multiple roles without duplicates", () => {
    const perms = resolvePermissions(["operator", "reviewer"]);
    expect(perms).toContain("run:create");   // from operator
    expect(perms).toContain("gate:reject");  // from reviewer
    const unique = new Set(perms);
    expect(unique.size).toBe(perms.length); // no duplicates
  });

  it("should normalise the Owner alias to admin permissions", () => {
    const ownerPerms = resolvePermissions(["Owner"]);
    const adminPerms = resolvePermissions(["admin"]);
    expect(ownerPerms.sort()).toEqual(adminPerms.sort());
  });

  it("should return empty array for an unknown role", () => {
    expect(resolvePermissions(["unknown"])).toEqual([]);
  });

  it("should return empty array for an empty roles list", () => {
    expect(resolvePermissions([])).toEqual([]);
  });
});
```

### cross-tenant.test.ts (integration skeleton)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp } from "../../../apps/control-service/test/helpers/test-app";
import { seedMultiTenantFixtures, clearFixtures } from "../../tests/fixtures/multi-tenant";
import { makeUserToken } from "../../tests/fixtures/token-factory";

describe("Cross-Tenant Isolation @security", () => {
  let app: ReturnType<typeof createTestApp>;
  let runAId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const { runIds } = await seedMultiTenantFixtures();
    runAId = runIds.orgA[0];
  });

  afterAll(async () => {
    await clearFixtures();
    await app.close();
  });

  it("should return 404 when a user from orgB requests a run from orgA", async () => {
    const tokenB = makeUserToken("user-admin-B", "org-B", ["admin"]);

    const response = await app.inject({
      method: "GET",
      url: `/v1/runs/${runAId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should list only orgB runs when authenticated as orgB admin", async () => {
    const tokenB = makeUserToken("user-admin-B", "org-B", ["admin"]);

    const response = await app.inject({
      method: "GET",
      url: "/v1/runs",
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    for (const run of body.runs) {
      expect(run.orgId).toBe("org-B");
    }
  });
});
```
