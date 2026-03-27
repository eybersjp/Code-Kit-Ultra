# Code Kit Ultra

Code Kit Ultra is a governed, observable, specialty-aware AI operating system for turning ideas into structured execution flows across planning, skills, implementation, automation, and promotion.

## Current release
**v1.0.0-rc2** — Productionization Sprint package

## Quickstart
```bash
git clone <your-repo-url>
cd Code-Kit-Ultra
cp .env.example .env
npm install
npm run bootstrap
npm run preflight
npm run test:smoke
npm run ck -- init "Build a planning engine for solar CRM" --dry-run
```

## Release workflow
```bash
npm run preflight
npm run package:release
```

See `docs/QUICKSTART.md`, `docs/RUNBOOK.md`, `docs/ROLLBACK.md`, `docs/DISASTER_RECOVERY.md`, and `docs/KNOWN_FAILURE_MODES.md`.