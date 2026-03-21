# Code Kit Ultra Phase 7

Phase 7 adds:
- Cursor specialist adapter
- Windsurf specialist adapter
- Antigravity production hardening
- policy-based runtime selection
- observability summary and metrics surface

## Commands

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- validate-env
npm run ck -- adapters
npm run ck -- metrics
npm run ck -- execute planning --payload '{"idea":"Build a planning engine"}'
npm run ck -- execute implementation --payload '{"idea":"Implement CRM module"}'
npm run ck -- init "Build a planning engine for solar CRM" --dry-run
```