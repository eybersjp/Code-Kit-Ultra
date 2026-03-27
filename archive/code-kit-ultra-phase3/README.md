# Code Kit Ultra — Phase 3

Phase 3 adds two major capabilities on top of the Phase 2 dry-run orchestration loop:

1. **Generated skill packages**
   - Writes reusable fallback skills to `skills/generated/<skillId>/`
   - Includes `SKILL.md`, `manifest.json`, `examples/`, and `tests/`
   - Validates manifest structure before writing

2. **Config-driven routing**
   - Uses `config/routing-policy.json` to choose adapters by task type
   - Boosts previously successful adapters using persistent memory
   - Keeps adapter selection configurable instead of hardcoded

## Run

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- init "Build a CRM for solar installers" --dry-run
```

## Key new files

- `config/routing-policy.json`
- `packages/adapters/src/router.ts`
- `packages/skill-engine/src/schema.ts`
- `packages/skill-engine/src/manifest.ts`
- `skills/generated/` (runtime output)

## Expected outcome

- Unmatched ideas produce reusable generated skill packages
- Adapter routing can be tuned via config only
- Memory influences future adapter selection
