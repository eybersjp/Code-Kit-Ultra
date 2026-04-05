# Code Kit Ultra (CKU) — v1.3.0

**Governed Autonomous Engineering OS — powered by InsForge.**

Code Kit Ultra turns raw operator intent into safe, auditable, enterprise-grade execution. It is not a coding assistant. It is a governed execution system: every action is planned, risk-scored, policy-gated, executed under controlled conditions, verified, and permanently audited.

---

## What CKU does

```
Operator Intent
  → Structured Plan
  → Simulation & Risk Scoring
  → Policy & Governance Gates
  → Approved Execution
  → Verification
  → Audit + Learning
```

CKU sits between the operator and any real system mutation. It enforces tenant scope, approval requirements, and execution mode constraints at every step — across CLI, IDE extension, and web control plane.

---

## InsForge Partnership

CKU is deeply integrated with **[InsForge](https://insforge.dev)** as its identity, policy, and backend substrate.

| Layer | Responsibility |
|-------|---------------|
| **CKU** | Execution intelligence — plans, gates, orchestration, verification |
| **InsForge** | Trust substrate — identity, signed context, policy decisions, audit authority, revocation |

InsForge provides the signed execution context that every CKU workflow is bound to: org, workspace, project, actor, role, environment, and correlation ID. No CKU action is anonymous, unscoped, or unaudited.

---

## Quick Start

```bash
npm install ckultra
```

```bash
# Initialize a project
npm run cku /ck-init "Build a multi-tenant SaaS dashboard"

# Run the governed pipeline
npm run cku /ck-run

# Approve a governance gate
npm run cku /ck-approve gate_governance_consensus

# System health check
npm run cku /ck-doctor
```

---

## Monorepo Structure

```
apps/
  control-service/        API server (Express, port 8080)
  cli/                    CLI surface
  web-control-plane/      Operator web UI

packages/
  shared/                 Shared types, logger, DB pool registry
  auth/                   JWT execution tokens, service account store, session revocation
  governance/             9 governance gates + GateManager (mode-aware)
  orchestrator/           Run state machine and step sequencer
  audit/                  SHA-256 hash-chain audit logger (dual-emit to InsForge)
  prompt-system/          Production prompt operating system (see below)
  insforge/               InsForge API client (signed context, PDP, revocation)
  observability/          Prometheus metrics
  core/                   Core domain types
  agents/                 Agent definitions
  adapters/               Provider adapters (GitHub, terminal, etc.)
  memory/                 Execution memory and context
  learning/               Outcome-driven learning loop
  healing/                Self-healing and remediation engine
  policy/                 Policy evaluation engine
  security/               Security primitives
  realtime/               WebSocket event bus
  skill-engine/           Skill routing and execution
  storage/                Storage adapters
  events/                 Canonical event contracts
  tools/                  Operator tooling
```

---

## Prompt Operating System

CKU includes a full **production prompt management system** — not static strings, but a versioned, governed, dynamically compiled runtime.

### Pipeline

```
Prompt Registry
  → Manifest Validator
  → Context Resolvers (session, tenant, policy, run, memory, adapters)
  → Policy Injector
  → InsForge Context Injector
  → Mode Injector (safe / balanced / god)
  → Handlebars Compiler
  → SHA-256 Fingerprint
  → AJV Output Schema Validation
  → Audit Log
  → BuiltPromptArtifact
```

### Agents

| Agent | Role |
|-------|------|
| `ai-ceo` | Strategic planning, execution routing, risk awareness |
| `dev-agent` | Code generation, refactoring, verification |
| `gate-manager` | Governance gate evaluation across 7 dimensions |
| `orchestrator` | Task decomposition, skill routing, state management |
| `mode-controller` | Risk calibration and execution mode selection |

### Execution Modes

| Mode | Behaviour |
|------|-----------|
| `safe` | Maximum questions, early escalation, explicit assumptions |
| `balanced` | Reasonable assumptions, escalate at policy threshold |
| `god` | Velocity-optimised, still obeys all gates and permissions |

### Usage

```ts
import { promptRuntime } from '@cku/prompt-system';

const artifact = await promptRuntime.build('ai-ceo', {
  mode: 'balanced',
  actor: { actorId: 'user_123', actorType: 'human' },
  tenant: { orgId: 'org_abc', workspaceId: 'ws_1', projectId: 'proj_x' },
  session: { authMode: 'session', permissions: ['run:create'], roles: ['developer'] },
  policy: { riskThreshold: 'medium', approvalRequired: false, restrictedCapabilities: [], allowedAdapters: ['github', 'terminal'] },
  run: { runId: 'run_001', correlationId: 'corr_001', goal: 'Add rate limiting to the API' },
  adapters: [{ name: 'github', available: true, capabilities: ['pr', 'commit'] }],
});

console.log(artifact.compiledPrompt);
console.log(artifact.fingerprint); // SHA-256 governance fingerprint
```

---

## Governance Gates

Every execution plan passes through the `GateManager` before any action is taken.

| Gate | Checks |
|------|--------|
| `ScopeGate` | File changes within declared project boundaries |
| `ArchitectureGate` | Proposed changes respect system architecture constraints |
| `SecurityGate` | No introduction of known vulnerability patterns |
| `CostGate` | Estimated compute/infrastructure cost within threshold |
| `DeploymentGate` | Deployment prerequisites met, no conflicting releases |
| `QAGate` | Test coverage and quality standards met |
| `BuildGate` | Build pipeline passes before execution proceeds |
| `LaunchGate` | Launch readiness criteria satisfied |
| `RiskThresholdGate` | Overall risk score within policy-permitted range |

Gate results: `pass` / `needs-review` / `blocked`. Any `blocked` result halts execution. `needs-review` results pause for human approval in `safe` mode.

---

## Authentication

CKU v1.3.0 uses **session-first authentication** backed by InsForge.

- Human operators authenticate via InsForge to obtain a signed session token
- Service accounts use rotating secrets (stored as bcrypt hashes)
- All tokens carry a `jti` claim for Redis-backed revocation
- `DELETE /v1/sessions/me` revokes the current session immediately

See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md).

---

## API

The control-service runs on port `8080`.

### Public endpoints (no auth)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | Readiness check (DB + Redis) |
| `GET` | `/metrics` | Prometheus metrics |

### Authenticated endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/runs` | Create a governed execution run |
| `GET` | `/v1/runs/:id` | Get run state |
| `POST` | `/v1/gates/:id/approve` | Approve a gate in needs-review |
| `POST` | `/v1/gates/:id/reject` | Reject a gate |
| `DELETE` | `/v1/sessions/me` | Revoke current session |
| `POST` | `/v1/service-accounts/:id/rotate` | Rotate a service account secret |

---

## Infrastructure

### Docker

```bash
docker compose up
```

Starts: `postgres:16`, `redis:7`, `control-service` on port `8080`.

### Kubernetes

Manifests in `k8s/`: Deployment, Service, HPA, ConfigMap, Namespace, Secret template.

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (InsForge managed) |
| `REDIS_URL` | Redis connection string |
| `INSFORGE_API_KEY` | InsForge API key |
| `INSFORGE_PROJECT_ID` | InsForge project ID |
| `INSFORGE_API_BASE_URL` | InsForge API base URL |

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
pnpm install
pnpm run db:migrate      # Apply schema migrations
pnpm run db:seed         # Load dev fixtures
```

### Commands

```bash
pnpm run typecheck       # TypeScript check across all packages
pnpm run test:auth       # Auth package tests
pnpm run test:governance # Governance gate tests
pnpm run test:smoke      # End-to-end smoke tests
```

---

## Security

See [SECURITY.md](./SECURITY.md) for the full security policy, supported versions, and vulnerability reporting.

Key posture:
- Security headers on all responses (HSTS, CSP, X-Frame-Options)
- Global rate limit: 100 req/min; token creation: 10 req/min
- All secrets redacted from logs via Pino redact
- Audit hash chain with PostgreSQL advisory locks prevents tampering

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Current release: **v1.3.0**.

---

## License

See LICENSE.
