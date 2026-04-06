# Phase 9 Status Report

## Overview
Phase 9 is focused on enterprise release hardening: secure RBAC, governance policy enforcement, and immutable audit logging.

This status report maps the Phase 9 specification from `docs/PHASE9.md` to the current repository implementation.

## Completed
- [x] `docs/PHASE9.md` exists and documents the Phase 9 vision.
- [x] `scripts/validate-phase9.sh` added and passes.
- [x] `package.json` includes:
  - `validate-phase9`
  - `test:phase9`
- [x] Authentication middleware in `apps/control-service/src/middleware/authenticate.ts` supports:
  - Bearer session auth via `Authorization: Bearer ...`
  - Legacy API key auth via `x-api-key`
- [x] Admin override support is implemented in `packages/core/src/auth.ts` using `CODEKIT_ADMIN_API_KEY`.
- [x] `packages/core/src/audit-logger.ts` implements immutable audit logging with:
  - run-local `audit-log.json`
  - global `.codekit/audit/events.ndjson`
  - cryptographic hashing via `hash` and `prevHash`
- [x] `config/policy.json` contains high-risk adapter restrictions and command blacklist rules.
- [x] `packages/core/src/policy-engine.ts` evaluates:
  - terminal command blacklist
  - adapter approval requirements for `github` and other restricted adapters
- [x] Phase 9 validation and tests are green:
  - `pnpm run validate-phase9`
  - `pnpm run test:phase9`

## Partial / Inferred
- [~] `apps/control-service/src/middleware/authenticate.ts` allows bearer session auth as well as API key auth.
  - This is stronger than legacy API key-only access, but the Phase 9 spec language says "All Control Service endpoints now require an `x-api-key` header." The current implementation supports both auth modes.
- [~] Policy mode is present in `config/policy.json` (`"mode": "balanced"`) and in the loaded profile, but the runtime policy evaluation currently does not use mode-specific enforcement beyond profile selection.

## Remaining / Still to be done
- [ ] Confirm and enforce whether Phase 9's `x-api-key` requirement should be mandatory for all control-service endpoints, or whether bearer session auth is intentionally allowed.
- [ ] Add explicit Control Service endpoint tests verifying `x-api-key` enforcement behavior for protected routes beyond `/v1/session`.
- [ ] Add runtime validation that `github` adapter actions are rejected unless `evaluatePolicy` returns `requiresApproval: true` and approval is granted by the operator.
- [ ] Document or implement the operational mode behavior so policy enforcement adapts to `mode` values such as `balanced` or `team-safe` in a more visible way.
- [ ] Add Phase 9-specific CLI or UI guidance if the spec intends end-user tooling beyond API auth / governance.

## Notes
- The audit log implementation is robust and matches the spec description of local logs and a global tamper-proof stream.
- Governance configuration is present and phase-specific enough to support both blacklist and adapter approval semantics.
- The remaining gap is mostly about explicit enforcement expectations and end-to-end policy approval flows, not about the underlying core abstractions.
