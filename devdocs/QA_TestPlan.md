# Quality Assurance & Test Plan: Code-Kit-Ultra

## 1. Objectives
Ensure 100% deterministic reliability for the core pipeline (Intake, Planner, Gates) and maintain system integrity through automated checks.

## 2. Testing Levels

### 2.1 Unit Testing (TS-Unit)
- **Scope**: Core logic for Intake, Mode-Controller, and Skill-Scoring.
- **Coverage**: Target >80% code coverage.
- **Command**: `npm run test:unit`

### 2.2 Integration Testing
- **Scope**: Multi-package orchestration (shared + orchestrator + memory).
- **Goal**: Verify that a full run correctly creates files in `.codekit/`.

### 2.3 Smoke Testing (High-Priority)
- **Scope**: CLI entry-points.
- **Goal**: Ensure `ck init` doesn't throw and returns the correct summary structure.
- **Command**: `npm run test:smoke`

### 2.4 Type-Checking
- **Scope**: Full monorepo consistency.
- **Goal**: Zero `any` casts or type regressions in production packages.
- **Command**: `npm run typecheck`

## 3. Test Gates (HeliosOS Standards)
- **Gate 1**: Implementation must be verified with `npm run typecheck`.
- **Gate 2**: All smoke tests must be green before local version bump.
- **Gate 3**: `npm run preflight` script must pass before any `git push`.

## 4. Test Environment
- **Runtime**: Node.js 22.x
- **CLI**: POSIX-compliant shell.
- **Isolation**: Each test run uses a local `tmp/` repo root to avoid polluting the actual project memory.
