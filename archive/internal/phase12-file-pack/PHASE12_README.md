# Phase 12 — Release Hardening

## Included files

- `README.md`
- `docs/getting-started.md`
- `docs/architecture.md`
- `docs/modes.md`
- `docs/adapters.md`

## What this phase does

- aligns the repo documentation with the implemented vertical slice
- clearly separates real functionality from mock functionality
- gives copy-paste setup and validation commands
- documents modes, architecture, and adapters
- makes the repository safer to hand to another developer or publish

## Recommended final validation

```bash
pnpm typecheck
pnpm tsx examples/smoke-test.ts
pnpm ck init "Build a CRM for solar installers" --mode balanced --dry-run
```

## Final release checklist

- README matches real implementation
- smoke tests pass
- CLI commands work
- generated artifacts persist correctly
- no stale placeholder messaging remains in public docs
