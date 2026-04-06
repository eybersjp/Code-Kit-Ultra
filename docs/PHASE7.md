# Phase 7 — Governance & SaaS Foundation

This phase completes the first enterprise-grade governance and SaaS-ready foundation for Code Kit Ultra.

## What’s included

- Tenant-scoped run creation with `orgId`, `workspaceId`, and `projectId`.
- Role-based access control with bearer sessions, legacy API keys, and admin override.
- Service account support for automated workloads.
- Policy engine governance for adapter approvals, command blacklisting, and rollback controls.
- Immutable audit logging for every run action and operator decision.
- Versioning guidance aligned to `v1.1.x` for governance and SaaS baseline releases.

## Core Delivery Areas

- `apps/control-service/src/middleware/authenticate.ts`
- `apps/control-service/src/handlers/create-run.ts`
- `packages/core/src/auth.ts`
- `packages/core/src/policy-engine.ts`
- `config/policy.json`
- `config/skill-registry.json`
- `apps/control-service/test/create-run.test.ts`
- `scripts/validate-governance.sh`

## Validation

Run the phase 7 checks:

```bash
pnpm run test:phase7
pnpm run validate-governance
```
