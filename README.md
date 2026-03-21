# Code Kit Ultra Vertical Slice — Phase 2

This package extends the first vertical slice with:
- `--dry-run`
- timestamped artifact bundles
- markdown and JSON reports
- gate snapshots
- simple persistent memory
- adapter contracts and mock adapters
- generated fallback skills

## Run

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- init "Build a CRM for solar installers" --dry-run
```

## Output

Artifacts are written to:
- `artifacts/test-runs/<timestamp>/run-report.json`
- `artifacts/test-runs/<timestamp>/report.md`
- `artifacts/test-runs/<timestamp>/console.log`
- `artifacts/test-runs/<timestamp>/gates.json`
- `.codekit/memory/project-memory.json`
