# Common Setup Errors

## Error: `.env is missing`
Fix:
```bash
cp .env.example .env
```

## Error: `npm not found`
Install Node.js and npm, then rerun the doctor script.

## Error: `artifacts/test-runs not found`
Run bootstrap:
```bash
npm run bootstrap
```
or create the folder manually.

## Error: `run-report.json missing`
Run a dry-run scenario again and check the latest timestamped artifact folder.

## Error: `permission denied` on scripts
Run:
```bash
chmod +x scripts/*.sh
```
