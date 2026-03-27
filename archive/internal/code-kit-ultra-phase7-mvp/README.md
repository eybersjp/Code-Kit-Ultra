# Code Kit Ultra — Phase 7 MVP

Code Kit Ultra Phase 7 MVP upgrades the thin orchestration slice into a working end-to-end repo scaffold that turns a raw idea into:

- interpreted intake
- assumptions
- clarifying questions
- a phased execution plan
- selected skills
- gate decisions
- mock platform execution
- markdown + JSON reports
- saved run artifacts

## Core loop

```text
idea -> intake -> clarify -> plan -> select skills -> evaluate gates -> mock execute -> generate report -> save artifact
```

## Included MVP modules

- CLI entry
- Orchestrator
- Mode controller
- Intake parser + clarifier
- Planner
- Skill registry + selector
- Gate manager
- Mock adapters
- JSON artifact persistence
- Markdown report generator

## Quick start

```bash
npm install
npm run typecheck
npm run test:all
npm run ck -- init "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing"
```

## Example output

The CLI prints:

- input interpretation
- assumptions
- clarifying questions
- plan tasks
- selected skills
- gate decisions
- mock adapter routing
- saved JSON report path
- saved markdown report path

## Folder structure

```text
apps/cli/
packages/orchestrator/
packages/memory/
packages/skill-engine/
packages/gate-manager/
packages/adapters/
packages/shared/
config/
skills/
prompts/
examples/
docs/
```

## Phase 7 MVP notes

This MVP keeps external platform execution mocked. The purpose is to prove system orchestration before wiring Cursor, Windsurf, Antigravity, n8n, or other real providers.
