# Code-Kit-Ultra

Code-Kit-Ultra is a deterministic orchestration starter for turning a raw project idea into a governed execution trace.

## What is implemented

The current vertical slice is working end to end:

- CLI entry point
- intake and clarification
- deterministic planner
- JSON-based skill registry and selector
- gate evaluation
- centralized mode controller
- end-to-end orchestrator
- local persistence for run artifacts and project memory
- smoke tests
- mock platform adapters for Antigravity, Cursor, and Windsurf

## What is not yet implemented

The following are intentionally **not** live yet:

- real external platform API integrations
- LLM-backed reasoning or autonomous execution
- production deployment automation
- live remote memory or team collaboration backends

The adapters currently prove architecture and handoff shape only. They are deterministic mocks.

## Architecture

```text
CLI
  -> intake
  -> planner
  -> skill selector
  -> gate manager
  -> run report assembly
  -> local persistence
```

Core packages:

- `packages/shared` — shared contracts and report types
- `packages/memory` — run artifact and project memory persistence
- `packages/orchestrator` — intake, planning, gates, modes, orchestration
- `packages/skill-engine` — skill registry and selector
- `packages/adapters` — mock platform adapters

## Modes

- `safe` — stricter review posture, more surfaced questions, conservative progression
- `balanced` — practical default for most runs
- `god` — more aggressive forward motion with higher ambiguity tolerance

See `docs/modes.md` for more detail.

## Quick start

### Install
```bash
pnpm install
```

### Typecheck
```bash
pnpm typecheck
```

### Run the CLI
```bash
pnpm ck init "Build a CRM for solar installers" --mode balanced --dry-run
```

### Run smoke tests
```bash
pnpm tsx examples/smoke-test.ts
```

## Expected outputs

Successful runs will create:

```text
.codekit/memory/project-memory.json
artifacts/test-runs/<timestamp>/run-report.json
```

## Example CLI flow

```bash
pnpm ck init "Build an AI agent that triages support tickets" --mode god
```

Typical report sections include:

- normalized objective
- assumptions
- clarifying questions
- execution plan
- selected skills
- gate decisions
- overall gate status
- persistence paths

## Adapters

Mock adapters exist for:

- Antigravity
- Cursor
- Windsurf

They can recommend a platform and return deterministic mock handoff payloads, but they do not yet call real external services.

See `docs/adapters.md`.

## Repository validation checklist

Before publishing or handing this repo to another developer:

1. Run `pnpm typecheck`
2. Run `pnpm tsx examples/smoke-test.ts`
3. Run one manual CLI example
4. Confirm `run-report.json` and `project-memory.json` are created
5. Confirm README and docs still match current implementation

## Current status

This repository is now suitable as:

- a governed orchestration starter
- a reference architecture for deterministic pipeline design
- a base for future real integrations and smarter execution layers

It should not yet be described as a fully autonomous AI build system with live external integrations.
