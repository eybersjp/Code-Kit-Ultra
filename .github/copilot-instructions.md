---
description: "Workspace-level AI assistant guidance for Code Kit Ultra. Use pnpm workspace commands, inspect docs, and respect this monorepo's architecture when editing or testing."
---

# Code Kit Ultra Workspace Instructions

## Use When
- working in this repository
- editing TypeScript or Node code in the monorepo
- adding features, fixing bugs, or updating docs
- generating tests or validating PR-ready changes

## Project Shape
- Monorepo with `packages/*`, `apps/*`, and `extensions/*`
- Root package is a `pnpm` workspace using `tsx`, `typescript`, and `vitest`
- Key runtime and UI pieces live in `apps/cli`, `apps/control-service`, and `apps/web-control-plane`
- Shared business logic and services live under `packages/`

## Common Commands
- `pnpm install`
- `pnpm run typecheck`
- `pnpm run test:auth`
- `pnpm run test:phase10_5`
- `pnpm run build`
- `pnpm run dev:web`
- `pnpm run preflight` (runs `typecheck` and `test:auth`)

## Recommended Workflow
- Prefer `pnpm` commands at the repo root
- Use `tsx` to execute local scripts and `vitest` for unit test runs
- Validate with `pnpm run preflight` when making code changes
- Keep changes narrow and avoid broad refactors without explicit request

## Repo Conventions
- Do not assume this is a single-package app; treat it as a workspace-based monorepo
- Preserve existing workspace structure unless the request explicitly requires restructuring
- Link to existing docs rather than duplicating them
- Avoid changing CI/workflow files unless the user specifically asks
- Do not modify `.agent/` internals unless the task is explicitly about the agent system

## Key Files and Docs
- `package.json`
- `pnpm-workspace.yaml`
- `.github/workflows/`
- `README.md`
- `CONTRIBUTING.md`
- `docs/AUTHENTICATION.md`
- `apps/cli/`, `apps/control-service/`, `apps/web-control-plane/`
- `packages/`

## Helpful References
- `README.md` for product purpose and quick start
- `CONTRIBUTING.md` for contribution expectations
- `docs/AUTHENTICATION.md` for auth flow details

## Example Prompts
- `Add a new endpoint in packages/auth with validation, unit tests, and documentation updates`
- `Refactor apps/cli/src/index.ts without changing command behavior`
- `Help update docs/AUTHENTICATION.md to reflect the current login flow`

## Next Customizations to Add
- `/create-agent code-kit-starter` for repository-specific AI guidance
- `/create-prompt pnpm-workspace-help` for common workspace commands
- `/create-hook preflight-check` to enforce `pnpm run preflight` before merge
