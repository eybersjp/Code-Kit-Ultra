# Code Kit Ultra

**Code Kit Ultra** is a governed, observable, specialty-aware AI operating system for turning ideas into structured execution flows across planning, skills, implementation, automation, and promotion.

## Why Code Kit Ultra
Code Kit Ultra combines:
- **Antigravity-first planning intelligence**
- **specialist implementation adapters** for Cursor and Windsurf
- **governed skill generation and promotion**
- **rollback-safe operations**
- **real/stub fallback routing**
- **observability and audit trails**
- **production-ready onboarding and release flow**

## What you can do
- start from an idea and generate a structured execution path
- route planning and skills through a primary reasoning engine
- route implementation through specialist adapters
- validate environments safely
- run dry-run scenarios without risking production systems
- observe execution history and adapter activity

## Current release
**v1.0.0** — Public Release

## Install in 10 minutes
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

## Core commands
```bash
npm run ck -- init "Build a planning engine for solar CRM" --dry-run
npm run ck -- execute planning --payload '{"idea":"Build a planning engine"}'
npm run ck -- adapters
npm run ck -- metrics
npm run ck -- validate-env
```

## Documentation
- `docs/QUICKSTART.md`
- `docs/FIRST_RUN_TUTORIAL.md`
- `docs/WHY_CODE_KIT_ULTRA.md`
- `docs/FEATURE_MATRIX.md`
- `docs/USE_CASES.md`
- `docs/INSTALL_IN_10_MINUTES.md`
- `docs/RUNBOOK.md`
- `docs/ROLLBACK.md`
- `docs/DISASTER_RECOVERY.md`

## Community
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `ROADMAP.md`
- `FAQ.md`
- GitHub issue templates
- pull request template

## Release workflow
```bash
npm run preflight
npm run build:public-release
npm run checksums
```

See `LAUNCH.md`, `ANNOUNCEMENT.md`, and `RELEASE_HIGHLIGHTS.md`.