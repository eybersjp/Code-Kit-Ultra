# Code Kit Ultra Phase 6 — Antigravity First

This package adds Antigravity-first real execution with:
- runtime real/stub selection
- normalized execution results
- execution audit logging
- secure env validation
- safe fallback to stubs

## Commands

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- validate-env
npm run ck -- adapters
npm run ck -- execute planning --payload '{"idea":"Build a planning engine"}' --dry-run
npm run ck -- execute planning --payload '{"idea":"Build a planning engine"}'
npm run ck -- init "Build a planning engine for solar CRM" --dry-run
```