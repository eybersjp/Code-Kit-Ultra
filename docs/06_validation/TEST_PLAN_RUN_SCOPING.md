# Test Plan: Run Scoping and Multi-Tenant Isolation

- **Document type**: Test Plan
- **Version target**: v1.3.0
- **Last updated**: 2026-04-04
- **Status**: Draft — not yet executed
- **Related risks**: R-02 (Default org bypass — Critical)

---

## 1. Purpose

Verify that all run operations are correctly scoped to the tenant hierarchy
(org → workspace → project) and that cross-tenant access is impossible under
any authenticated request. A user or service account belonging to orgA must
never be able to read, mutate, or enumerate runs that belong to orgB, even if
they hold a valid JWT.

This plan also directly verifies the remediation of security risk **R-02**:
the `default` org exemption in `resolveSession` must be removed and blocked
at the API layer before v1.3.0 ships.

---

## 2. Scope

### In scope

| Area | Package / App |
|------|---------------|
| Run creation (POST /v1/runs) | `apps/control-service` |
| Run retrieval (GET /v1/runs, GET /v1/runs/:id) | `apps/control-service` |
| Run state transitions (cancel, pause, resume) | `apps/control-service` |
| Session resolution and tenant scoping | `packages/auth` |
| Audit event scoping | `apps/control-service` |
| SSE stream tenant isolation | `apps/control-service` |
| RBAC permission checks on run operations | `packages/auth`, `apps/control-service` |
| Orchestrator run context propagation | `packages/orchestrator` |

### Out of scope

- InsForge platform internals
- Third-party AI provider calls
- Billing and usage metering

---

## 3. Test Infrastructure

### 3.1 Multi-Tenant DB Fixture

All tests in this plan require a seeded test database with the following
entities. The fixture must be created fresh for each test file and torn down
after (using `beforeAll` / `afterAll` with `tx.rollback()`).

**Organizations**

| ID | Name |
|----|------|
| `org-a` | Org Alpha |
| `org-b` | Org Bravo |

**Workspaces**

| ID | Org | Name |
|----|-----|------|
| `ws-1` | org-a | Alpha Primary |
| `ws-2` | org-a | Alpha Secondary |
| `ws-3` | org-b | Bravo Primary |

**Projects**

| ID | Workspace | Name |
|----|-----------|------|
| `proj-1` | ws-1 | Alpha P1 |
| `proj-2` | ws-1 | Alpha P2 |
| `proj-3` | ws-2 | Alpha P3 |
| `proj-4` | ws-3 | Bravo P1 |
| `proj-5` | ws-3 | Bravo P2 |

**Users**

| ID | Org | Role | Member of |
|----|-----|------|-----------|
| `user-a-admin` | org-a | org:admin | all org-a workspaces |
| `user-a-member` | org-a | workspace:member | ws-1 only |
| `user-a-viewer` | org-a | project:viewer | proj-1 only |
| `user-b-admin` | org-b | org:admin | all org-b workspaces |
| `user-b-member` | org-b | workspace:member | ws-3 only |
| `sa-org-a` | org-a | service_account | — |

**Pre-seeded Runs**

| ID | Org | Workspace | Project | Created by |
|----|-----|-----------|---------|------------|
| `run-a1` | org-a | ws-1 | proj-1 | user-a-admin |
| `run-a2` | org-a | ws-1 | proj-2 | user-a-member |
| `run-a3` | org-a | ws-2 | proj-3 | user-a-admin |
| `run-b1` | org-b | ws-3 | proj-4 | user-b-admin |
| `run-b2` | org-b | ws-3 | proj-5 | user-b-member |

### 3.2 Vitest Fixture Code

```typescript
// tests/fixtures/multi-tenant-db.ts
import { beforeAll, afterAll } from 'vitest';
import { db } from '../../src/db';

export async function seedMultiTenantFixture() {
  await db.transaction(async (tx) => {
    // Orgs
    await tx.insert(orgs).values([
      { id: 'org-a', name: 'Org Alpha' },
      { id: 'org-b', name: 'Org Bravo' },
    ]);

    // Workspaces
    await tx.insert(workspaces).values([
      { id: 'ws-1', orgId: 'org-a', name: 'Alpha Primary' },
      { id: 'ws-2', orgId: 'org-a', name: 'Alpha Secondary' },
      { id: 'ws-3', orgId: 'org-b', name: 'Bravo Primary' },
    ]);

    // Projects
    await tx.insert(projects).values([
      { id: 'proj-1', workspaceId: 'ws-1', orgId: 'org-a' },
      { id: 'proj-2', workspaceId: 'ws-1', orgId: 'org-a' },
      { id: 'proj-3', workspaceId: 'ws-2', orgId: 'org-a' },
      { id: 'proj-4', workspaceId: 'ws-3', orgId: 'org-b' },
      { id: 'proj-5', workspaceId: 'ws-3', orgId: 'org-b' },
    ]);

    // Users and memberships (abbreviated — expand per user table schema)
    await tx.insert(users).values([
      { id: 'user-a-admin', orgId: 'org-a', role: 'org:admin' },
      { id: 'user-a-member', orgId: 'org-a', role: 'workspace:member' },
      { id: 'user-a-viewer', orgId: 'org-a', role: 'project:viewer' },
      { id: 'user-b-admin', orgId: 'org-b', role: 'org:admin' },
      { id: 'user-b-member', orgId: 'org-b', role: 'workspace:member' },
    ]);

    // Pre-seeded runs
    await tx.insert(runs).values([
      { id: 'run-a1', orgId: 'org-a', workspaceId: 'ws-1', projectId: 'proj-1', actorId: 'user-a-admin' },
      { id: 'run-a2', orgId: 'org-a', workspaceId: 'ws-1', projectId: 'proj-2', actorId: 'user-a-member' },
      { id: 'run-a3', orgId: 'org-a', workspaceId: 'ws-2', projectId: 'proj-3', actorId: 'user-a-admin' },
      { id: 'run-b1', orgId: 'org-b', workspaceId: 'ws-3', projectId: 'proj-4', actorId: 'user-b-admin' },
      { id: 'run-b2', orgId: 'org-b', workspaceId: 'ws-3', projectId: 'proj-5', actorId: 'user-b-member' },
    ]);
  });
}

export async function teardownMultiTenantFixture() {
  await db.transaction(async (tx) => {
    await tx.delete(runs);
    await tx.delete(projects);
    await tx.delete(workspaces);
    await tx.delete(orgs);
    await tx.delete(users);
  });
}
```

---

## 4. Test Cases

### 4.1 Describe: Run Creation Scoping

```typescript
describe('Run Creation Scoping', () => {
  it('should scope run to provided orgId/workspaceId/projectId', async () => {
    const res = await api.post('/v1/runs', {
      orgId: 'org-a',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      idea: 'test run',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(201);
    expect(res.body.run.orgId).toBe('org-a');
    expect(res.body.run.workspaceId).toBe('ws-1');
    expect(res.body.run.projectId).toBe('proj-1');
  });

  it('should scope run to workspace when no projectId provided', async () => {
    const res = await api.post('/v1/runs', {
      orgId: 'org-a',
      workspaceId: 'ws-1',
      idea: 'workspace-level run',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(201);
    expect(res.body.run.orgId).toBe('org-a');
    expect(res.body.run.workspaceId).toBe('ws-1');
    expect(res.body.run.projectId).toBeNull();
  });

  it("should reject POST /v1/runs with orgId from caller's non-member org → 403", async () => {
    // user-a-admin is in org-a, attempts to create a run in org-b
    const res = await api.post('/v1/runs', {
      orgId: 'org-b',
      workspaceId: 'ws-3',
      projectId: 'proj-4',
      idea: 'cross-tenant attempt',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it("should scope service account run to SA's organization", async () => {
    const res = await api.post('/v1/runs', {
      idea: 'sa run',
    }, { as: 'sa-org-a' });

    expect(res.status).toBe(201);
    expect(res.body.run.orgId).toBe('org-a');
    expect(res.body.run.actorType).toBe('service_account');
  });

  it('should include actorId and actorType in created run', async () => {
    const res = await api.post('/v1/runs', {
      orgId: 'org-a',
      workspaceId: 'ws-1',
      idea: 'actor check',
    }, { as: 'user-a-member' });

    expect(res.status).toBe(201);
    expect(res.body.run.actorId).toBe('user-a-member');
    expect(res.body.run.actorType).toBe('user');
  });
});
```

---

### 4.2 Describe: Run Retrieval Isolation

```typescript
describe('Run Retrieval Isolation', () => {
  it("GET /v1/runs should return only runs in caller's accessible projects", async () => {
    const res = await api.get('/v1/runs', { as: 'user-a-member' });

    expect(res.status).toBe(200);
    const ids = res.body.runs.map((r: Run) => r.id);
    expect(ids).toContain('run-a2');       // user-a-member's own run in ws-1
    expect(ids).not.toContain('run-b1');   // org-b run — must not appear
    expect(ids).not.toContain('run-b2');   // org-b run — must not appear
  });

  it("GET /v1/runs/{id} where id belongs to orgB, caller is orgA user → 404", async () => {
    const res = await api.get('/v1/runs/run-b1', { as: 'user-a-admin' });

    // Must be 404, not 403 — do not reveal that the run exists
    expect(res.status).toBe(404);
  });

  it('admin user should see all runs in their org', async () => {
    const res = await api.get('/v1/runs', { as: 'user-a-admin' });

    expect(res.status).toBe(200);
    const ids = res.body.runs.map((r: Run) => r.id);
    expect(ids).toContain('run-a1');
    expect(ids).toContain('run-a2');
    expect(ids).toContain('run-a3');
    expect(ids).not.toContain('run-b1');
    expect(ids).not.toContain('run-b2');
  });

  it("viewer in project should see only that project's runs", async () => {
    // user-a-viewer has project:viewer on proj-1 only
    const res = await api.get('/v1/runs', { as: 'user-a-viewer' });

    expect(res.status).toBe(200);
    const ids = res.body.runs.map((r: Run) => r.id);
    expect(ids).toContain('run-a1');     // proj-1 run — visible
    expect(ids).not.toContain('run-a2'); // proj-2 run — not visible
    expect(ids).not.toContain('run-a3'); // proj-3 run — not visible
  });

  it('pagination should not allow enumerating runs across tenants', async () => {
    // Fetch many pages as user-a-admin; none should contain org-b runs
    let page = 1;
    let totalOrgBLeaks = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await api.get(`/v1/runs?page=${page}&limit=2`, { as: 'user-a-admin' });
      expect(res.status).toBe(200);
      const leaked = res.body.runs.filter((r: Run) => r.orgId === 'org-b');
      totalOrgBLeaks += leaked.length;
      hasMore = res.body.hasNextPage;
      page++;
    }

    expect(totalOrgBLeaks).toBe(0);
  });
});
```

---

### 4.3 Describe: Run State Management Isolation

```typescript
describe('Run State Management Isolation', () => {
  it('POST /v1/runs/{id}/cancel where run is in orgB → 404 not 403', async () => {
    // user-a-admin targets a run that belongs to org-b
    const res = await api.post('/v1/runs/run-b1/cancel', {}, { as: 'user-a-admin' });

    expect(res.status).toBe(404);
    // Must not be 403 — that would confirm the run's existence
    expect(res.status).not.toBe(403);
  });

  it('POST /v1/runs/{id}/resume by user without run:update permission → 403', async () => {
    // user-a-viewer only has project:viewer, not run:update
    const res = await api.post('/v1/runs/run-a1/resume', {}, { as: 'user-a-viewer' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /v1/runs/{id}/pause by different org user → 404', async () => {
    const res = await api.post('/v1/runs/run-a1/pause', {}, { as: 'user-b-member' });

    expect(res.status).toBe(404);
  });
});
```

---

### 4.4 Describe: Audit Trail Scoping

```typescript
describe('Audit Trail Scoping', () => {
  it('audit events should include orgId, workspaceId, projectId', async () => {
    const res = await api.post('/v1/runs', {
      orgId: 'org-a',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      idea: 'audit check',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(201);
    const runId = res.body.run.id;

    const auditRes = await api.get(`/v1/audit?runId=${runId}`, { as: 'user-a-admin' });
    expect(auditRes.status).toBe(200);

    const event = auditRes.body.events[0];
    expect(event.orgId).toBe('org-a');
    expect(event.workspaceId).toBe('ws-1');
    expect(event.projectId).toBe('proj-1');
  });

  it("GET /v1/audit should only return events from caller's tenant", async () => {
    const res = await api.get('/v1/audit', { as: 'user-a-admin' });

    expect(res.status).toBe(200);
    const orgIds = res.body.events.map((e: AuditEvent) => e.orgId);
    expect(orgIds.every((id: string) => id === 'org-a')).toBe(true);
  });

  it('SSE stream should not leak events from other tenants', async () => {
    const received: SSEEvent[] = [];

    // Connect as user-a-admin
    const stream = await sseClient.connect('/v1/stream', { as: 'user-a-admin' });
    stream.on('event', (e: SSEEvent) => received.push(e));

    // Trigger an org-b action as user-b-admin
    await api.post('/v1/runs', { idea: 'b event', orgId: 'org-b' }, { as: 'user-b-admin' });
    await wait(200); // allow SSE propagation window

    stream.close();
    const orgBLeaks = received.filter((e) => e.orgId === 'org-b');
    expect(orgBLeaks).toHaveLength(0);
  });
});
```

---

### 4.5 Describe: Default Org Bypass (Security Bug R-02)

```typescript
describe('Default Org Bypass — R-02', () => {
  it("POST /v1/runs with orgId='default' should be rejected with 400", async () => {
    const res = await api.post('/v1/runs', {
      orgId: 'default',
      workspaceId: 'ws-1',
      idea: 'bypass attempt',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ORG_ID');
  });

  it("resolveSession with orgId='default' should not bypass tenant checks", async () => {
    // Call resolveSession directly (unit test)
    const { resolveSession } = await import('packages/auth/src/session');
    const session = await resolveSession({
      token: buildValidToken({ sub: 'user-a-admin', org: 'org-a' }),
      requestedOrgId: 'default',
    });

    expect(session).toBeNull();
  });

  it("removing the 'default' exemption should not break normal runs", async () => {
    // Confirm org-a runs still work correctly after the fix
    const res = await api.post('/v1/runs', {
      orgId: 'org-a',
      workspaceId: 'ws-1',
      idea: 'normal run after fix',
    }, { as: 'user-a-admin' });

    expect(res.status).toBe(201);
    expect(res.body.run.orgId).toBe('org-a');
  });
});
```

---

## 5. Pass Criteria

All tests in this plan must pass before the v1.3.0 release tag is cut. Failure
of any isolation test, particularly those in section 4.5, is a **hard block**.

| Category | Required | Notes |
|----------|----------|-------|
| Run Creation Scoping | 5/5 pass | — |
| Run Retrieval Isolation | 5/5 pass | — |
| Run State Management Isolation | 3/3 pass | — |
| Audit Trail Scoping | 3/3 pass | — |
| Default Org Bypass (R-02) | 3/3 pass | Hard block — cannot ship with any failure |

---

## 6. Related Documents

- `docs/06_validation/SECURITY_TESTING_PLAN.md`
- `docs/06_validation/GO_NO_GO_CHECKLIST.md`
- `docs/06_validation/PRODUCTION_READINESS.md`
- `docs/06_validation/TEST_PLAN_AUTH.md`
- `docs/06_validation/TEST_PLAN_RBAC.md`
