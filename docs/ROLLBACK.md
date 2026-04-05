# Rollback Procedure: v1.3.0 → v1.2.0

**Document type:** Operational Runbook  
**Last updated:** 2026-04-04  
**Applies to:** Production and staging environments

---

## When to Rollback

Initiate rollback when any of the following occur within 30 minutes of a v1.3.0 deploy:

- Error rate > 5% on any endpoint (baseline < 0.1%)
- P99 latency > 2s sustained for 5+ minutes
- Health endpoint (`/health`) returning non-200
- Data integrity issues in audit hash chain
- Authentication failures spiking (> 10% of requests)

---

## Pre-Rollback Checklist

Before executing rollback, confirm:

- [ ] Incident declared; on-call notified
- [ ] Current error rate and impact scope documented
- [ ] Decision to rollback approved by on-call lead
- [ ] Rollback window opened (no conflicting deploys)

---

## Step 1: Drain Traffic (< 2 minutes)

### Kubernetes
```bash
# Scale down new deployment to 0 replicas
kubectl scale deployment cku-control-service --replicas=0 -n cku

# Verify pods are terminating
kubectl get pods -n cku -w
```

### Docker Compose (staging)
```bash
docker-compose stop control-service
```

---

## Step 2: Restore v1.2.0 Image (< 3 minutes)

### Kubernetes
```bash
# Set image back to v1.2.0
kubectl set image deployment/cku-control-service \
  cku-control-service=cku-control-service:1.2.0 -n cku

# Watch rollout
kubectl rollout status deployment/cku-control-service -n cku
```

### Docker Compose
```bash
# Set the image tag in docker-compose.yml and restart
docker-compose up -d control-service
```

---

## Step 3: Database Migration Reversal (if needed)

> Only required if v1.3.0 added DB schema changes that break v1.2.0.
> v1.3.0 added `schema_migrations` tracking table (safe to leave).
> v1.3.0 added `secret_hash` column to `service_accounts`.

### Check if reversal needed
```sql
-- Connect to production DB
psql $DATABASE_URL

-- List tables added in v1.3.0
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  'organizations','workspaces','projects','users',
  'organization_memberships','project_memberships',
  'permissions','role_permissions','service_accounts',
  'runs','steps','adapters','outcomes','gates',
  'audit_events','runs_metadata'
);
```

### Revert `schema_migrations` table (optional — v1.2.0 ignores it)
```sql
-- Safe to leave; v1.2.0 will ignore the table
-- Only drop if causing issues:
DROP TABLE IF EXISTS schema_migrations;
```

### Revert `secret_hash` column from `service_accounts`
```sql
-- v1.2.0 does not use this column; safe to leave
-- Drop only if storage is a concern:
ALTER TABLE service_accounts DROP COLUMN IF EXISTS secret_hash;
```

---

## Step 4: Environment Variable Cleanup

v1.3.0 requires `DATABASE_URL` and `CKU_SERVICE_ACCOUNT_SECRET` at startup.
v1.2.0 does not require `DATABASE_URL`.

If rolling back to v1.2.0, `DATABASE_URL` can remain set (v1.2.0 ignores it).

---

## Step 5: Verify Rollback Success (< 5 minutes)

```bash
# Health check
curl -s http://localhost:8080/health | jq .

# Expected: {"status":"ok","version":"1.2.0-enterprise-hardened",...}

# Test authentication
curl -s http://localhost:8080/v1/session \
  -H "Authorization: Bearer $TEST_TOKEN" | jq .

# Test run creation
curl -s -X POST http://localhost:8080/runs \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idea":"test run","mode":"balanced"}' | jq .
```

---

## Step 6: Post-Rollback Actions

- [ ] Confirm error rate returned to baseline (< 0.1%)
- [ ] Confirm P99 latency returned to baseline (< 200ms)
- [ ] Notify stakeholders of rollback completion
- [ ] Open incident post-mortem document
- [ ] Document root cause in `docs/04_tracking/decision-log.md`
- [ ] Remove v1.3.0 from release pipeline until fix is ready
- [ ] Re-run smoke tests against v1.2.0 to confirm stability

---

## Rollback Time Targets

| Step | Target Duration |
|------|----------------|
| Drain traffic | < 2 minutes |
| Restore v1.2.0 image | < 3 minutes |
| DB reversal (if needed) | < 5 minutes |
| Verification | < 5 minutes |
| **Total** | **< 15 minutes** |

---

## Contacts

| Role | Action |
|------|--------|
| On-call engineer | Execute rollback |
| Engineering lead | Approve rollback decision |
| Platform team | DB migration reversal support |

