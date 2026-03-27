# Code Kit Ultra

Code Kit Ultra is an autonomous AI product-building operating system that turns raw ideas into production-ready solutions through executive orchestration, specialist agents, dynamic skills, memory, gates, and multi-platform execution.

## What this scaffold includes

- `prompts/` production prompt pack structure
- `skills/` reusable skill packages using `SKILL.md`
- `adapters/` platform adapter stubs for Cursor, Windsurf, Antigravity, n8n, and Windmill
- `packages/` core orchestration, memory, skill engine, and gate manager modules
- `apps/cli/` a starter CLI entry point
- `docs/` placeholder for the docs portal
- `config/` mode, routing, and registry configuration
- `.github/workflows/` starter CI workflow
- `examples/` reference projects

## Repo goals

This repository is structured to support:

1. idea intake and execution mode control
2. plan-first orchestration
3. dynamic skill loading and generation
4. gate-based control and safety
5. memory persistence and project learning
6. multi-platform routing for build execution

## Recommended stack

- TypeScript for orchestration and adapters
- Markdown for prompt and skill authoring
- YAML for config and registries
- Python optional for codegen or data-heavy skills

## Quick start

```bash
npm install
npm run build
npm run cli -- init
```

## Core concepts

### Modes
- Safe
- Balanced
- God

### Gates
- Clarity
- Scope
- Architecture
- Build
- QA
- Security
- Cost
- Deployment
- Launch

### Skill packages
Each skill package contains:
- `SKILL.md`
- optional templates/scripts/examples
- validation guidance
- dependencies metadata

## Status

This is a starter scaffold, not a full production implementation. It is designed to give you the correct repo shape and starter artifacts so development can begin immediately.
