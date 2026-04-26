# Code Kit Ultra — Claude Code Context

## Quick Start

```bash
# Install dependencies (workspace-aware, must use pnpm)
pnpm install

# Run preflight checks (security + quality gates)
pnpm run preflight

# Run all tests (unit, integration, E2E)
pnpm run test:all

# Start development infrastructure
docker compose up -d

# Start web control plane
pnpm run dev:web
```

## Monorepo Structure

This is a **pnpm monorepo** with 3 workspaces covering 13 packages + 4 apps + 1 IDE extension:

### `packages/` — Core Libraries (13 packages)

**Phase 1 (High-Priority):**

- [**shared**](packages/shared/CLAUDE.md) — Shared types, logger, DB pool registry
- [**auth**](packages/auth/CLAUDE.md) — JWT execution tokens, session revocation, RBAC, InsForge integration
- [**policy**](packages/policy/CLAUDE.md) — Policy evaluation (role-mapping, permissions)
- [**governance**](packages/governance/CLAUDE.md) — 9 governance gates + risk scoring + adaptive consensus
- [**orchestrator**](packages/orchestrator/CLAUDE.md) — Run state machine and step sequencing

**Phase 2 (Tier A - Optional):**

- [**audit**](packages/audit/CLAUDE.md) — SHA-256 hash-chain audit logger (dual-emit to InsForge)
- [**agents**](packages/agents/CLAUDE.md) — Agent profiles and definitions (used by governance consensus)
- [**realtime**](packages/realtime/CLAUDE.md) — WebSocket event bus for real-time updates
- [**observability**](packages/observability/CLAUDE.md) — Prometheus metrics and traces
- [**learning**](packages/learning/CLAUDE.md) — Outcome-driven learning loop + policy evolution
- [**healing**](packages/healing/CLAUDE.md) — Self-healing strategies and rollback coordination
- [**skill-engine**](packages/skill-engine/CLAUDE.md) — Skill routing, registration, and execution
- [**prompt-system**](packages/prompt-system/CLAUDE.md) — Dynamic prompt compilation and versioning

**Tier B (Orchestration):**

- [**core**](packages/core/CLAUDE.md) — Foundational utilities, type helpers, shared constants
- [**adapters**](packages/adapters/CLAUDE.md) — Pluggable adapter system for platform integration
- [**cku**](packages/cku/CLAUDE.md) — CLI framework and command definitions
- [**storage**](packages/storage/CLAUDE.md) — Artifact and log storage abstraction (local, InsForge, combined)

### `apps/` — Applications (4 apps)

- [**control-service**](apps/control-service/CLAUDE.md) — Express.js orchestration hub (port 7474), governs all execution
- [**cli**](apps/cli/CLAUDE.md) — Command-line interface wrapper using control-service API
- [**web-control-plane**](apps/web-control-plane/CLAUDE.md) — React operator control plane UI for governance
- [**web-landing**](apps/web-landing/CLAUDE.md) — Next.js landing page with docs and examples

### `extensions/` — IDE Extensions (1 extension)

- [**code-kit-vscode**](extensions/code-kit-vscode/CLAUDE.md) — VS Code integration with sidebar views and approvals

## Development Setup

### Docker (Recommended)
```bash
docker compose up -d
```
Starts PostgreSQL (5432), Redis (6379), control-service in containers.

### Manual Setup (macOS/Linux)
```bash
# PostgreSQL 16 (macOS)
brew install postgresql@16 && brew services start postgresql@16

# PostgreSQL 16 (Ubuntu)
sudo apt-get install postgresql-16 && sudo systemctl start postgresql

# Redis 7 (macOS)
brew install redis && brew services start redis

# Redis 7 (Ubuntu)
sudo apt-get install redis-server && sudo systemctl start redis-server
```

**Note**: Windows users should use Docker or WSL2 for development. Native Windows PostgreSQL/Redis setup is not tested.

## Cross-Cutting Documentation (5+ guides)

Comprehensive guides for system design, policy configuration, testing, and automation:

**Core Architecture & Design:**

- [**System Architecture**](docs/ARCHITECTURE.md) — System layers, request/execution flows, package dependency graph
- [**Config Schema**](docs/CONFIG_SCHEMA.md) — policy.json reference, mode-specific overrides, role definitions

**Testing & Quality:**

- [**Testing Guide**](docs/TESTING.md) — Consolidated test commands, patterns, and fixtures
- [**Security Runbooks**](docs/SECURITY_RUNBOOKS.md) — Credential rotation, incident response, audit verification

**Phase 3 Automation:**

- [**Phase 3 Workflow Design**](docs/PHASE_3_WORKFLOW_DESIGN.md) — Auto-approval chains, alert acknowledgment, test verification, healing, rollback workflows

## Key Testing Commands

| Command | Purpose |
|---------|---------|
| `pnpm run preflight` | Type checking + auth tests (critical path validation) |
| `pnpm run test:auth` | Auth module tests |
| `pnpm run test:governance` | Governance gates tests |
| `pnpm run test:unit` | All unit tests |
| `pnpm run test:integration` | Control-service integration tests |
| `pnpm run test:coverage` | Coverage report (target 80%+) |
| `pnpm run test:smoke` | Smoke tests only (fastest feedback) |
| `pnpm run typecheck` | TypeScript type checking across all workspaces |

## Governance Pipeline

CKU enforces **9 governance gates** on every execution:

1. **Security** — Auth token validation, RBAC
2. **Quality** — Test coverage, linting
3. **Operations** — Audit readiness, risk scoring
4. **Plan Approval** — Execution plan review
5-9. **Context Gates** — Tenant scope, approval consensus, etc.

Gates are mode-aware (dev, staging, prod) via `config/policy.json`.

## Environment Variables

Required (see `.env.example`):
- `ANTIGRAVITY_API_KEY`, `ANTIGRAVITY_BASE_URL` — Identity provider
- `CURSOR_API_KEY`, `CURSOR_BASE_URL` — Cursor integration
- `WINDSURF_API_KEY`, `WINDSURF_BASE_URL` — Windsurf integration
- `CODEKIT_PROFILE` — Execution mode (default: `local-safe`)
- `CODEKIT_TIMEOUT_MS`, `CODEKIT_MAX_RETRIES` — Execution timeouts

## Current Work State

- **workflows/** — New workflow system under development
- **policy/permissions.ts, role-mapping.ts** — RBAC updates
- **middleware/authenticate.ts** — Session handling improvements
- **vitest.integration.config.ts** — Integration test runner (not in root config)

Run integration tests separately:
```bash
pnpm exec vitest run --config apps/control-service/vitest.integration.config.ts
```

## Gotchas

1. **Execution Tokens** — All API calls require signed JWT tokens from `packages/auth`
2. **Policy Evaluation** — `config/policy.json` drives gate decisions; changes require service restart
3. **Audit Trail** — Every execution step is logged to SHA-256 chain + InsForge
4. **Immutable Patterns** — State updates use spread operators (never mutate)
5. **Integration Tests** — Use separate Vitest config; connect to real PostgreSQL
6. **Dependency Management** — Always use `pnpm run` for scripts; never run `pnpm install` in individual packages (workspace-aware)
7. **Type Checking** — Run `pnpm run typecheck` before commits to catch type errors across workspaces
8. **Docker on Windows** — WSL2 backend required; native Windows Docker Desktop works but volume mounts use forward slashes (`/`)
