# Code Kit Ultra

Code Kit Ultra is a governed, observable, specialty-aware AI operating system for turning ideas into structured execution flows across planning, skills, implementation, automation, and promotion.

## What it does
- routes planning to **Antigravity-first** intelligence
- routes heavy implementation work to **Cursor** and **Windsurf** specialists
- supports **dry-run safe orchestration**
- generates and promotes reusable skills
- records **audit trails**, **metrics**, and **adapter health**
- keeps execution under governance and rollback control

## Current release
**v1.0.0-rc1** — Productization Sprint package

## Quickstart
```bash
git clone <your-repo-url>
cd Code-Kit-Ultra
cp .env.example .env
npm install
npm run bootstrap
npm run validate-env
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

## Repo map
- `apps/cli` — CLI entry point
- `packages/orchestrator` — planning and execution flow
- `packages/adapters` — real/stub adapters and runtime routing
- `packages/observability` — metrics and execution visibility
- `packages/memory` — local memory and execution history
- `config/` — adapter, routing, runtime, and profile config
- `templates/` — starter project templates
- `examples/` — demo projects and smoke test fixtures
- `docs/` — quickstart, architecture, release notes, and support docs

## Product pillars
- **Governed** — approval, promotion, rollback, and audit trails
- **Observable** — metrics, health checks, execution logs
- **Specialty-aware** — Antigravity for planning, Cursor/Windsurf for implementation
- **Safe by default** — dry-run, fallback adapters, env validation

## Roadmap
- Phase 8: productization and release candidate
- Phase 9: productionization and CI/release hardening
- Phase 10: public release and hosted observability

See `docs/QUICKSTART.md`, `RELEASE.md`, and `CHANGELOG.md`.