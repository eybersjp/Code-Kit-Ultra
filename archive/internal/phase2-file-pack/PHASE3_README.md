# Phase 3 File Pack — Real CLI Bootstrap

## Files included
- `apps/cli/src/index.ts`

## What this phase does
- Replaces the old fake CLI init flow with a typed bootstrap
- Accepts `idea`, optional `--mode`, and optional `--dry-run`
- Builds a temporary typed `RunReport`
- Persists the run through `recordRun()` from `packages/memory`
- Preserves `validate-env` and `metrics` commands in a way compatible with the new memory layer

## Example commands
```bash
pnpm ck init "Build an AI quoting assistant" --mode balanced --dry-run
pnpm ck validate-env
pnpm ck metrics
```

## Expected output
Successful `init` runs print:
- idea
- mode
- dry-run flag
- summary
- artifact directory
- run report path
- project memory path

## Manual verification checklist
1. Run the `init` command.
2. Confirm a new folder appears in `artifacts/test-runs/<timestamp>/`.
3. Confirm `run-report.json` exists inside that folder.
4. Confirm `.codekit/memory/project-memory.json` is updated.
5. Run `metrics` and confirm the run count increments.
