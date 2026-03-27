# First Run Tutorial

## Goal
Run your first dry-run scenario successfully.

## Steps
1. copy `.env.example` to `.env`
2. install dependencies
3. run bootstrap
4. run preflight
5. execute:
```bash
npm run ck -- init "Build a planning engine for solar CRM" --dry-run
```

## Expected result
You should get a timestamped artifact bundle under `artifacts/test-runs/`.