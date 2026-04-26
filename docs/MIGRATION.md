# Migration Guide

Version upgrades, schema migrations, and breaking changes for Code Kit Ultra.

## Version History

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| 0.1.0 | 2026-01-15 | Stable | Initial release |
| 0.2.0 | 2026-02-15 | Current | Governance gates, RBAC enhancements |
| 0.3.0 | 2026-04-26 | Beta | Workflow system, healing improvements |

---

## Upgrade Procedures

### Upgrading from v0.1.0 to v0.2.0

**Duration:** 15-30 minutes (with testing)

**Breaking Changes:**
- Policy configuration schema changed
- Auth token format updated (JWT with new claims)
- Gate evaluation response format modified

**Pre-Upgrade Checklist:**

```bash
# 1. Backup database
pg_dump -h localhost -U postgres -d codekit > codekit-v0.1-backup.sql

# 2. Backup Redis
docker compose exec redis redis-cli BGSAVE
docker compose exec redis redis-cli LASTSAVE

# 3. Stop services
docker compose down

# 4. Verify backup success
ls -lh codekit-v0.1-backup.sql
```

**Upgrade Steps:**

1. **Update dependencies:**
   ```bash
   git pull origin main
   pnpm install
   ```

2. **Run database migrations:**
   ```bash
   docker compose up postgres -d
   sleep 10
   pnpm run db:migrate
   ```

3. **Update configuration:**
   ```bash
   # Backup old config
   cp config/policy.json config/policy.json.v0.1
   
   # Review new config schema
   cat config/policy.v0.2.example.json
   
   # Update policy.json with new gate definitions
   # See: docs/CONFIG_SCHEMA.md for details
   ```

4. **Update environment variables:**
   ```bash
   # Old: GOVERNANCE_GATES_ENABLED
   # New: CODEKIT_GATES (array format)
   # Example:
   export CODEKIT_GATES=security,quality,operations,plan-approval,context
   ```

5. **Verify migrations:**
   ```bash
   pnpm run db:migrate:status
   # Should show all migrations applied
   ```

6. **Start services:**
   ```bash
   docker compose up -d
   ```

7. **Verify health:**
   ```bash
   curl http://localhost:7474/health
   docker compose logs control-service | head -20
   ```

8. **Run smoke tests:**
   ```bash
   pnpm run test:smoke
   pnpm run test:integration
   ```

**Rollback Procedure (if needed):**

```bash
# 1. Stop services
docker compose down

# 2. Restore database from backup
psql -h localhost -U postgres < codekit-v0.1-backup.sql

# 3. Restore Redis backup
docker compose exec redis redis-cli BGREWRITEAOF

# 4. Downgrade code
git checkout v0.1.0

# 5. Restart
docker compose up -d
```

---

### Upgrading from v0.2.0 to v0.3.0

**Duration:** 30-45 minutes (with testing)

**Breaking Changes:**
- Step execution format changed
- Healing system API redesigned
- Audit log schema updated

**Pre-Upgrade Checklist:**

```bash
# 1. Backup everything
pg_dump -h localhost -U postgres -d codekit > codekit-v0.2-backup.sql
docker compose exec redis redis-cli BGSAVE

# 2. Check current version
pnpm run version  # Should show v0.2.0

# 3. Review breaking changes
cat docs/BREAKING_CHANGES_v0.3.md
```

**Upgrade Steps:**

1. **Update code:**
   ```bash
   git pull origin main
   pnpm install
   pnpm run build
   ```

2. **Review new features:**
   ```bash
   # New workflow system
   cat packages/workflows/CLAUDE.md
   
   # Updated healing system
   cat packages/healing/CLAUDE.md
   ```

3. **Run migrations:**
   ```bash
   pnpm run db:migrate
   
   # Verify
   docker compose exec postgres psql -U postgres -d codekit -c "
     SELECT version, executed_at FROM migrations ORDER BY executed_at DESC LIMIT 5;
   "
   ```

4. **Update configuration:**
   ```bash
   # New workflow definitions
   cp config/workflows.v0.3.example.json config/workflows.json
   
   # Update healing strategies
   cp config/healing.v0.3.example.json config/healing.json
   ```

5. **Run data migration script:**
   ```bash
   # Migrate existing runs to new format
   pnpm run migrate:runs:v0.3
   ```

6. **Start services:**
   ```bash
   docker compose up -d
   docker compose logs -f control-service
   ```

7. **Run full test suite:**
   ```bash
   pnpm run test:all
   pnpm run test:coverage
   ```

---

## Schema Migrations

### Creating a New Migration

```bash
# Generate migration file
pnpm run db:create-migration "add_workflow_table"

# This creates: migrations/YYYYMMDDHHMMSS_add_workflow_table.ts

# Edit migration file
cat migrations/YYYYMMDDHHMMSS_add_workflow_table.ts
```

**Migration Template:**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('workflows', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.json('definition').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('workflows');
}
```

### Running Migrations

```bash
# Run all pending migrations
pnpm run db:migrate

# Run specific migration
pnpm run db:migrate --target=YYYYMMDDHHMMSS

# Rollback last migration
pnpm run db:migrate:rollback

# Rollback all migrations
pnpm run db:migrate:reset
```

### Verifying Migrations

```bash
# Check migration status
pnpm run db:migrate:status

# List all migrations
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT version, name, installed_on 
  FROM migrations 
  ORDER BY version DESC;
"

# Verify schema is correct
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
"
```

---

## Breaking Changes

### v0.1.0 → v0.2.0

**Gate Evaluation Response:**

```javascript
// v0.1.0
{
  "gateId": "security",
  "decision": "APPROVE",
  "reason": "passed security checks"
}

// v0.2.0
{
  "id": "gate-123",
  "gateId": "security",
  "status": "approved",
  "decision": "APPROVE",
  "reason": "passed security checks",
  "appliedAt": "2026-02-15T10:00:00Z",
  "metadata": {
    "rulesEvaluated": 5,
    "rulsFailed": 0
  }
}
```

**Migration:** Update API consumers to use new response format. Provide adapter if needed.

**Auth Token Claims:**

```javascript
// v0.1.0
{
  "sub": "user-123",
  "iat": 1234567890,
  "exp": 1234571490
}

// v0.2.0
{
  "sub": "user-123",
  "iat": 1234567890,
  "exp": 1234571490,
  "scope": ["runs:read", "runs:create", "gates:approve"],
  "org": "acme-corp",
  "roles": ["operator", "approver"]
}
```

**Migration:** Regenerate tokens with new claims structure.

### v0.2.0 → v0.3.0

**Step Execution Format:**

```javascript
// v0.2.0
{
  "stepId": "step-1",
  "action": "deploy",
  "status": "completed",
  "duration": 5000
}

// v0.3.0
{
  "id": "step-456",
  "runId": "run-123",
  "workflowId": "workflow-1",
  "type": "step",
  "action": "deploy",
  "status": "completed",
  "startedAt": "2026-04-26T10:00:00Z",
  "completedAt": "2026-04-26T10:00:05Z",
  "duration": 5000,
  "result": {
    "success": true,
    "output": { /* ... */ }
  },
  "healing": {
    "enabled": true,
    "appliedAt": "2026-04-26T10:00:06Z"
  }
}
```

**Migration:** Database migration automatically converts old format.

**Healing API:**

```javascript
// v0.2.0
POST /runs/:runId/heal
Response: { healingId, status }

// v0.3.0
POST /runs/:runId/heal
Response: {
  id: "healing-plan-789",
  runId: "run-123",
  status: "in_progress",
  steps: [
    { stepId: "step-1", strategy: "rollback", status: "pending" }
  ],
  appliedAt: "2026-04-26T10:00:00Z"
}
```

**Migration:** Update calling code to use new API response format.

---

## Data Backup Strategy

### Pre-Upgrade Backup

```bash
#!/bin/bash
BACKUP_DIR="/opt/codekit/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/v$VERSION"

# PostgreSQL dump
pg_dump -h localhost -U postgres codekit | \
  gzip > "$BACKUP_DIR/v$VERSION/codekit-$TIMESTAMP.sql.gz"

# Redis backup
docker compose exec redis redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/v$VERSION/redis-$TIMESTAMP.rdb"

# Application config
cp config/policy.json "$BACKUP_DIR/v$VERSION/policy-$TIMESTAMP.json"
cp .env "$BACKUP_DIR/v$VERSION/env-$TIMESTAMP"

# Verify backups
ls -lh "$BACKUP_DIR/v$VERSION"
```

### Restore from Backup

```bash
#!/bin/bash
BACKUP_DIR="/opt/codekit/backups"
BACKUP_DATE="20260215-100000"

# Stop services
docker compose down

# Restore PostgreSQL
gunzip -c "$BACKUP_DIR/v0.1/codekit-$BACKUP_DATE.sql.gz" | \
  psql -h localhost -U postgres

# Restore Redis
docker compose up -d redis
docker cp "$BACKUP_DIR/v0.1/redis-$BACKUP_DATE.rdb" \
  codekit_redis_1:/data/dump.rdb

# Restart
docker compose up -d

# Verify
curl http://localhost:7474/health
```

---

## Troubleshooting Upgrades

### Migration Failed

**Symptoms:**
```
Error: Migration "YYYYMMDDHHMMSS_xxx" failed
```

**Diagnosis:**

```bash
# Check migration status
pnpm run db:migrate:status

# View error details
docker compose logs postgres | grep -i error

# Check for locks
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT * FROM pg_stat_activity WHERE state != 'idle';
"
```

**Solutions:**

1. **Kill blocking connections:**
   ```bash
   docker compose exec postgres psql -U postgres -d codekit -c "
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE datname = 'codekit' 
     AND pid != pg_backend_pid();
   "
   ```

2. **Rollback and retry:**
   ```bash
   pnpm run db:migrate:rollback
   pnpm run db:migrate
   ```

3. **Restore from backup if needed:**
   ```bash
   # Follow "Restore from Backup" procedure above
   ```

### Service Won't Start After Upgrade

**Symptoms:**
```
control-service exit code 1
```

**Diagnosis:**

```bash
# Check service logs
docker compose logs control-service --tail 50

# Check configuration
docker compose config | head -30

# Verify database connectivity
docker compose exec postgres pg_isready -U postgres
```

**Solutions:**

1. **Check environment variables:**
   ```bash
   # Old env vars may no longer be valid
   cat .env
   # Compare with .env.example
   ```

2. **Verify database migrations completed:**
   ```bash
   pnpm run db:migrate:status
   # Should show all migrations applied
   ```

3. **Rollback if necessary:**
   ```bash
   git checkout main
   git reset --hard origin/v0.1.0
   docker compose down
   psql -h localhost -U postgres < codekit-v0.1-backup.sql
   docker compose up -d
   ```

### Configuration Incompatibility

**Symptoms:**
```
Error: Invalid policy configuration
```

**Diagnosis:**

```bash
# Validate configuration
pnpm run validate:config

# Check schema
cat docs/CONFIG_SCHEMA.md

# Compare with example
diff config/policy.json config/policy.v0.2.example.json
```

**Solution:**

```bash
# Backup old config
cp config/policy.json config/policy.json.backup

# Copy example
cp config/policy.v0.2.example.json config/policy.json

# Customize for your environment
nano config/policy.json

# Verify
pnpm run validate:config
```

---

## Release Notes

### v0.2.0 - Governance and RBAC

**Features:**
- 9 governance gates for execution control
- Role-based access control (RBAC)
- Policy evaluation engine
- Gate approval workflows
- Risk scoring

**Breaking Changes:**
- Gate evaluation response format changed
- Auth token claims updated
- Policy configuration schema redesigned

**Deprecations:**
- Old auth token format (use new token claims)
- Legacy policy configuration (migrate to v0.2 format)

**Bug Fixes:**
- Fixed race condition in gate evaluation
- Improved error messages in policy evaluation
- Fixed token revocation propagation

**Performance:**
- Gate evaluation: 50-100ms (down from 200-500ms)
- Policy evaluation: cached and optimized
- Token validation: faster claim verification

### v0.3.0 - Workflows and Healing

**Features:**
- Workflow system for complex orchestration
- Enhanced healing and remediation
- Improved audit logging
- Better observability

**Breaking Changes:**
- Step execution format updated
- Healing API redesigned
- Audit log schema changed

**Deprecations:**
- Old healing strategies (map to new system)
- Legacy step format (auto-migrated)

**Bug Fixes:**
- Fixed healing step timing issues
- Improved error recovery
- Fixed audit log hash chain

**Performance:**
- Step execution: optimized for parallel healing
- Healing remediation: faster recovery
- Audit logging: reduced overhead

---

## Dependency Updates

### Major Version Bumps

| Package | Old | New | Breaking Changes |
|---------|-----|-----|-------------------|
| Express | 4.17 | 4.18 | Middleware signature changed |
| TypeScript | 4.6 | 4.9 | Some type checking stricter |
| Knex | 2.1 | 2.4 | Migration API improved |
| PostgreSQL | 14 | 16 | JSON operators enhanced |
| Node.js | 16 | 18 | Async stack traces improved |

### Updating Dependencies

```bash
# Update to latest
pnpm update

# Check for breaking changes
pnpm audit

# Update specific package
pnpm update --filter control-service express@latest

# Verify builds
pnpm run build
pnpm run test:all
```

---

## Cross-References

**Depends on:**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Environment setup
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Debugging upgrades
- [Root CLAUDE.md](../CLAUDE.md) — System overview

**Related guides:**
- [SECURITY_RUNBOOKS.md](SECURITY_RUNBOOKS.md) — Secure upgrades
- [control-service](../apps/control-service/CLAUDE.md) — API changes
- [governance package](../packages/governance/CLAUDE.md) — Gate system
