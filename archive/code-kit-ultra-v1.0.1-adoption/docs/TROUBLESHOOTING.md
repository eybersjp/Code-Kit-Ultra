# Troubleshooting

## The doctor script fails
Run:
```bash
bash scripts/doctor.sh
```
Follow the first failing check before trying anything else.

## `.env` is missing
Run:
```bash
cp .env.example .env
```

## Demo script does not create artifacts
Confirm:
- `artifacts/test-runs/` exists
- the CLI entry point exists
- bootstrap completed successfully

## Smoke test fails
Check:
- Node version
- dependency install state
- missing required files
- stale local folders

## Real adapters are unavailable
This is expected in many local setups. Use dry-run and stub-backed flows until credentials are ready.
