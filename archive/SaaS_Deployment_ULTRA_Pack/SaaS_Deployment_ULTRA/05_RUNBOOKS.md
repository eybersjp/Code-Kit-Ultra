# Runbooks

## Runbook: Auth Outage

1. Confirm InsForge auth connectivity
2. Check JWKS reachability
3. Verify issuer/audience config
4. Fail closed for privileged actions
5. Communicate operator impact
6. Restore and validate /v1/session

## Runbook: Worker Backlog
1. Check queue depth and worker health
2. Scale worker pool
3. Pause new high-risk runs if needed
4. Verify drain rate
5. Review failed jobs and retries

## Runbook: Artifact Storage Failure

1. Confirm provider error
2. Enable local fallback if supported
3. Mark uploads degraded
4. Retry asynchronously
5. Reconcile metadata after restoration

## Runbook: Tenant Access Incident
1. Freeze affected routes
2. Capture audit evidence
3. Isolate tenant data path
4. Review scope resolution
5. Patch and verify
6. Notify stakeholders if required

### Useful CLI Commands
- Check tenant access logs: `grep 'orgId=TARGET_ID' logs/*.json`
- Validate environment mode: `npm run validate-env -- --mode saas`
- Emergency rollback: `bash scripts/rollback.sh --force`
