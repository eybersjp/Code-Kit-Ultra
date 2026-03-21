# Runbook

## Startup
1. `cp .env.example .env`
2. `npm install`
3. `npm run bootstrap`
4. `npm run preflight`

## Health checks
- `npm run validate-env`
- `npm run ck -- adapters`
- `npm run ck -- metrics`

## Release prep
- `npm run typecheck`
- `npm run test:smoke`
- `npm run validate:docs`
- `npm run package:release`