# Phase 8 — GitHub & Control Service Delivery

Phase 8 completes the enterprise-ready control surface for Code Kit Ultra by connecting the platform to real GitHub workflows and enabling manual run remediation.

## What’s included

- GitHub adapter support for `commit`, `push`, `create-pr`, and `commit-and-pr`.
- Manual retry and rollback of execution steps through the Control Service API.
- Dedicated CLI support for run remediation:
  - `/ck-retry-step <runId> [stepId]`
  - `/ck-rollback-step <runId> [stepId]`
  - `serve` to start the local Control Service.
- Environment guard for GitHub operations using `GITHUB_TOKEN`.

## Validation

Run the Phase 8 checks:

```bash
pnpm run test:phase8
pnpm run validate-phase8
```

## Notes

This phase builds on Phase 7 governance and SaaS foundation, adding real source control integration and operator-driven recovery flows.
