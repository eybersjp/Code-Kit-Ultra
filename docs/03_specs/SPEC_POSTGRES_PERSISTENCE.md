# SPEC — PostgreSQL Runtime Persistence

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/DATA_MODEL.md`
**Implements:** Master spec Section 10 — Database and Persistence Design
**Unblocks:** T1-4 implementation
**Risk refs:** R-04, R-14, R-20

---

## Objective

Wire the existing PostgreSQL schema (`/db/schema.sql`) to the control-service runtime. Replace in-memory Maps and file-based state with DB-backed persistence for all operational data: runs, gate decisions, service accounts, audit events, and canonical events.

---

## Scope

**In scope:**
- Database client initialisation and connection pool
- Migration runner (`scripts/migrate.ts`)
- Seed script (`scripts/seed.ts`)
- Runtime persistence for: runs, plan_tasks, gate_decisions, service_accounts, audit_events, canonical_events, outcome_records
- Local fallback for audit events in dev mode

**Out of scope:**
- Artifact storage (covered in a future SPEC_ARTIFACT_STORAGE.md)
- Learning/healing state persistence (future spec)
- Read replicas or connection routing

---

## Data Structures

### Schema Alignment

| Runtime Concept | Current Storage | Target DB Table | Action Required |
|----------------|-----------------|-----------------|-----------------|
| Service accounts | `Map<string, ServiceAccount>` | `service_accounts` | Replace Map with DB |
| Runs | Mixed (in-memory + file) | `runs` | Wire to DB |
| Plan tasks | File-based | `plan_tasks` | Create table + wire |
| Gate decisions | In-memory | `gate_decisions` | Create table + wire |
| Audit events | `.ndjson` files | `audit_events` | Dual-write then migrate |
| Canonical events | In-memory/realtime | `canonical_events` | Wire to DB |
| Outcome records | File-based | `outcome_records` | Wire to DB |

### Schema Fixes Required

Current `/db/schema.sql` uses different table names from the spec. Required changes:

```sql
-- Rename run_steps → plan_tasks
ALTER TABLE run_steps RENAME TO plan_tasks;
ALTER TABLE plan_tasks ADD COLUMN done_definition TEXT NOT NULL DEFAULT '';
ALTER TABLE plan_tasks ADD COLUMN phase TEXT NOT NULL DEFAULT 'intake';

-- Rename run_approvals → gate_decisions
ALTER TABLE run_approvals RENAME TO gate_decisions;
ALTER TABLE gate_decisions ADD COLUMN gate_type TEXT NOT NULL DEFAULT 'clarity';
ALTER TABLE gate_decisions ADD COLUMN should_pause BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gate_decisions ADD COLUMN decision_note TEXT;

-- Rename audit_logs → audit_events
ALTER TABLE audit_logs RENAME TO audit_events;
```

---

## Implementation

### 1. Database Client — `apps/control-service/src/db/client.ts`

```typescript
import { Pool } from 'pg';

let pool: Pool;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    pool = new Pool({ connectionString, max: 20, idleTimeoutMillis: 30000 });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await getDbPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
```

### 2. Migration Runner — `scripts/migrate.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { query } from '../apps/control-service/src/db/client.js';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db/migrations');

async function runMigrations() {
  // Create migrations tracking table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const executed = new Set(
    (await query<{ filename: string }>('SELECT filename FROM _migrations')).map(r => r.filename)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executed.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await query(sql);
    await query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`✅ ${file} complete`);
  }

  console.log('All migrations up to date.');
}

runMigrations().catch(err => { console.error(err); process.exit(1); });
```

### 3. Run Store — `apps/control-service/src/db/runs.ts`

```typescript
import { query } from './client.js';
import type { RunState } from '@cku/shared';

export async function insertRun(run: RunState): Promise<void> {
  await query(`
    INSERT INTO runs (id, organization_id, workspace_id, project_id,
      actor_id, actor_type, auth_mode, correlation_id,
      idea, mode, status, priority, deliverable)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    run.id, run.orgId, run.workspaceId, run.projectId,
    run.actorId, run.actorType, run.authMode, run.correlationId,
    run.idea, run.mode, run.status, run.priority, run.deliverable,
  ]);
}

export async function updateRunStatus(runId: string, status: string): Promise<void> {
  await query(
    'UPDATE runs SET status = $1, updated_at = now() WHERE id = $2',
    [status, runId]
  );
}

export async function getRunById(runId: string): Promise<RunState | null> {
  const rows = await query<RunState>('SELECT * FROM runs WHERE id = $1', [runId]);
  return rows[0] ?? null;
}

export async function listRuns(projectId: string): Promise<RunState[]> {
  return query<RunState>(
    'SELECT * FROM runs WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );
}
```

### 4. Service Account Persistence — `apps/control-service/src/db/service-accounts.ts`

Replace in-memory Map in `apps/control-service/src/routes/service-accounts.ts` with:

```typescript
import { query } from './client.js';
import type { ServiceAccount } from '@cku/shared';

export async function insertServiceAccount(sa: ServiceAccount): Promise<void> {
  await query(`
    INSERT INTO service_accounts (id, name, org_id, workspace_id, project_id, scopes, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, now())
  `, [sa.id, sa.name, sa.orgId, sa.workspaceId, sa.projectId, JSON.stringify(sa.scopes)]);
}

export async function listServiceAccounts(orgId: string): Promise<ServiceAccount[]> {
  return query<ServiceAccount>(
    'SELECT * FROM service_accounts WHERE org_id = $1',
    [orgId]
  );
}

export async function deleteServiceAccount(id: string): Promise<void> {
  await query('DELETE FROM service_accounts WHERE id = $1', [id]);
}
```

### 5. Startup Initialisation — `apps/control-service/src/index.ts`

```typescript
import { getDbPool } from './db/client.js';

async function start() {
  // Verify DB connection on startup
  try {
    await getDbPool().query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  // Start Express server
  app.listen(PORT, () => console.log(`Control service running on :${PORT}`));
}

start();
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/control-service/src/db/client.ts` | Create — connection pool |
| `apps/control-service/src/db/runs.ts` | Create — run CRUD |
| `apps/control-service/src/db/gates.ts` | Create — gate decision CRUD |
| `apps/control-service/src/db/service-accounts.ts` | Create — SA CRUD |
| `apps/control-service/src/db/audit.ts` | Create — audit event writes |
| `apps/control-service/src/db/events.ts` | Create — canonical event writes |
| `scripts/migrate.ts` | Create — migration runner |
| `scripts/seed.ts` | Create — seed runner |
| `apps/control-service/src/routes/service-accounts.ts` | Modify — replace Map with DB |
| `apps/control-service/src/handlers/create-run.ts` | Modify — persist run to DB |
| `packages/audit/src/write-audit-event.ts` | Modify — dual-write: ndjson + DB |
| `packages/events/src/publish-event.ts` | Modify — persist to canonical_events |
| `apps/control-service/src/index.ts` | Modify — DB init on startup |
| `package.json` | Modify — implement db:migrate and db:seed scripts |
| `db/migrations/004_rename_tables.sql` | Create — rename run_steps/run_approvals/audit_logs |

---

## Dependencies

- `DATABASE_URL` environment variable must be set
- PostgreSQL 14+ instance accessible from control-service
- Schema tables created in order: organizations → workspaces → projects → runs → plan_tasks → gate_decisions → audit_events → canonical_events → outcome_records

---

## Edge Cases

- **Migration already run**: migration runner checks `_migrations` table before re-running
- **DB connection failure at startup**: service should exit with code 1 (not silently degrade)
- **Audit events in dev mode**: if DB not available, fall back to ndjson file writing with a warning
- **Large audit queries**: pagination required for `GET /v1/audit` — default page size 50

---

## Risks

- **Data loss during rename**: the table rename migration must be tested on a copy of production data first
- **Connection pool exhaustion**: set appropriate `max` pool size and add connection pool metrics

---

## Definition of Done

- [ ] `npm run db:migrate` executes all migrations without error
- [ ] `npm run db:seed` populates development tenant, users, and permissions
- [ ] Service accounts survive server restart
- [ ] Runs created via API appear in PostgreSQL `runs` table
- [ ] Gate decisions appear in `gate_decisions` table
- [ ] Audit events written to `audit_events` table
- [ ] Service fails to start if `DATABASE_URL` is not set
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
