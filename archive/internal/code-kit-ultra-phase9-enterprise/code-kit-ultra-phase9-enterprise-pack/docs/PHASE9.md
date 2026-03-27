# Phase 9 — Enterprise Release Hardening

Phase 9 upgrades Code Kit Ultra into an enterprise-ready governed execution platform.

## Included

- API-key auth and RBAC for the control-service API
- policy engine with environment-safe execution rules
- tamper-evident audit log with hash chaining
- metrics endpoint for operational visibility
- GitHub Checks support in the GitHub adapter
- enterprise verification test covering auth, policy, audit, and metrics

## Default API keys

- `admin-key`
- `operator-key`
- `reviewer-key`
- `viewer-key`

You can also override admin auth with `CODEKIT_ADMIN_API_KEY`.

## New endpoints

- `GET /metrics`
- `GET /policy`
- `GET /runs/:runId/audit`

## Role model

- `admin`: execute, approve, retry, rollback, inspect
- `operator`: execute, retry, inspect
- `reviewer`: approve, inspect, approvals
- `viewer`: inspect only

## Policy behavior

Default policy requires approval for GitHub adapters and blocks destructive shell patterns. Explicit plan tasks can still require approval for any adapter.

## Audit model

Every critical action appends a signed event with `prevHash` and `hash` into `.codekit/runs/<runId>/audit-log.json`.
