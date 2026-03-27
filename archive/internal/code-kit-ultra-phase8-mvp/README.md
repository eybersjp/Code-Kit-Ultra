# Code Kit Ultra — Phase 8 Governed Execution MVP

Code Kit Ultra Phase 8 upgrades the Phase 7 scaffold into a governed execution system with:

- provider adapter interface
- real local file-system execution
- governed execution loop
- retries and rollback hooks
- resumable runs
- rich `.codekit/runs/<run-id>/` artifacts
- IDE-native JSON schema for intake, plan, gates, adapters, and execution logs

## Core loop

```text
idea -> intake -> clarify -> plan -> select skills -> evaluate gates -> execute steps -> pause if approval needed -> resume -> report -> save artifacts
```

## What is real in this MVP

- File system adapter writes actual files into `.codekit/generated/`
- Terminal adapter can run safe local commands in dry-run or explicit execution mode
- State store persists every run as a folder that can be resumed
- Execution log records every attempt, retry, rollback, pause, and completion event

## What remains provider-mocked

- GitHub adapter
- AI adapter
- API adapter

These are wired through the same provider interface so they can be replaced with real credentials later without changing the orchestrator contract.

## Quick start

```bash
npm install
npm run typecheck
npm run test:all
npm run ck -- init "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing"
```

Resume a paused run:

```bash
npm run ck -- resume <run-id>
```

Approve and resume a run:

```bash
npm run ck -- approve <run-id>
```

Inspect a run:

```bash
npm run ck -- inspect <run-id>
```

## Artifact layout

```text
.codekit/runs/<run-id>/
  intake.json
  plan.json
  gates.json
  adapters.json
  execution-log.json
  state.json
  report.md
```

## IDE control plane compatibility

This repo writes the multi-file artifact schema expected by the aligned Phase 7 IDE-native control plane:

- intake idea and normalized input live in `intake.json`
- specialist gates and pause states live in `gates.json`
- adapter execution summaries live in `adapters.json`
- detailed step lifecycle logs live in `execution-log.json`
- resumable state lives in `state.json`

## Main folders

```text
apps/cli/
packages/adapters/
packages/gate-manager/
packages/memory/
packages/orchestrator/
packages/shared/
packages/skill-engine/
config/
docs/
examples/
```
