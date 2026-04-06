# System Architecture — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**See also:** `docs/01_vision/MASTER_VISION.md`, `docs/02_architecture/DATA_MODEL.md`

---

## Architectural Stance

Code Kit Ultra is an **orchestration, governance, execution, and learning plane** sitting on top of InsForge as the **identity, storage, and realtime plane**. These planes are strictly separated. The extension, CLI, and web UI are pure operator surfaces — they never contain authoritative business logic.

```
┌─────────────────────────────────────────────────────┐
│               OPERATOR SURFACES                      │
│   CLI (apps/cli)  │  VS Code Extension  │  Web UI   │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / Bearer token
┌────────────────────────▼────────────────────────────┐
│             CONTROL PLANE (apps/control-service)     │
│  Middleware: authenticate → authorize → handlers     │
│  Routes: /v1/runs  /v1/gates  /v1/audit  /v1/events │
└────────────────────────┬────────────────────────────┘
                         │ internal imports
┌────────────────────────▼────────────────────────────┐
│               ORCHESTRATION LAYER                    │
│  packages/orchestrator  packages/skill-engine        │
│  Intake → Planning → Gate eval → Execution → Healing │
└──────┬────────────────────────────────┬─────────────┘
       │                                │
┌──────▼──────────┐          ┌──────────▼────────────┐
│ GOVERNANCE LAYER │          │   EXECUTION LAYER     │
│ packages/policy  │          │ ProviderAdapters:     │
│ packages/core    │          │  FileSystem           │
│ gate-manager     │          │  Terminal             │
│ mode-controller  │          │  GitHub               │
└─────────────────┘          └───────────────────────┘
       │                                │
┌──────▼────────────────────────────────▼─────────────┐
│              STATE & CROSS-CUTTING                   │
│ packages/auth   packages/audit   packages/events     │
│ packages/realtime   packages/storage   packages/memory│
│ packages/learning   packages/healing   packages/observability│
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                   INSFORGE PLANE                     │
│  JWT issuance  │  Supabase DB  │  Storage  │  Realtime│
└─────────────────────────────────────────────────────┘
```

---

## Layer Map

| Layer | Primary Responsibility | Key Packages / Apps |
|-------|----------------------|---------------------|
| Interface | Commands, approvals, visualisation | `apps/cli`, `extensions/code-kit-vscode`, `apps/web-control-plane` |
| Control API | Session resolution, auth, routing, event publication | `apps/control-service` |
| Orchestration | Intake, planning, skill selection, phase progression | `packages/orchestrator`, `packages/skill-engine` |
| Governance | Policy, gates, risk posture, kill-switch | `packages/policy`, gate-manager (in orchestrator), `packages/core` |
| Execution | Simulation, execution, verification, rollback | `packages/adapters/src/providers/`, execution-engine |
| AI Routing | Select AI model for plan/code/scaffold tasks | `packages/adapters/src/` (AI adapters) |
| State & Memory | Run artefacts, local fallback, learning store | `packages/memory`, `packages/storage` |
| Cross-cutting | Auth, audit, events, realtime, observability | `packages/auth`, `packages/audit`, `packages/events`, `packages/realtime`, `packages/observability` |
| Learning | Outcome capture, reliability, adaptive policy | `packages/learning`, `packages/healing` |

---

## Package Topology

```
apps/
  cli/                        # CLI entry point
  control-service/            # Express REST API (port 7474)
    src/
      index.ts                # App init, route mount, DB init
      middleware/
        authenticate.ts       # Multi-strategy bearer token verification
        authorize.ts          # Permission + scope enforcement
      handlers/               # Thin route handlers delegating to packages
      routes/
        session.ts
        service-accounts.ts
      db/                     # PostgreSQL access layer
        client.ts             # Connection pool
        runs.ts               # Run CRUD
        gates.ts              # Gate decision CRUD
        service-accounts.ts   # SA CRUD
        audit.ts              # Audit event writes
  web-control-plane/          # React + Vite (port 7473, proxy to 8080)

extensions/
  code-kit-vscode/            # VS Code extension
    src/
      extension.ts            # Activation, command registration
      auth/sessionClient.ts   # InsForge sign-in, token cache
      api/client.ts           # Axios with bearer injection
      status/statusBar.ts     # Status bar controller

packages/
  shared/                     # Types, contracts (zero dependencies)
  auth/                       # JWT verification, session resolution, execution tokens
  policy/                     # RBAC permissions, role mapping
  core/                       # Legacy auth helpers, core policy primitives
  orchestrator/               # Full execution pipeline
    src/
      intake.ts               # Idea normalisation, assumptions, questions
      mode-controller.ts      # 7 mode policies
      planner.ts              # Category-aware task generation
      gate-manager.ts         # 5 quality + 9 governance gates
      execution-engine.ts     # Task execution with healing integration
      phase-engine.ts         # Phase state machine
      action-runner.ts        # Batch action execution
      batch-queue.ts          # Pending batch persistence
      rollback-engine.ts      # Reverse-chronological undo
      healing-integration.ts  # Bridge to healing-engine
      outcome-engine.ts       # Post-run learning signal
      resume-run.ts           # Resume paused/failed runs
  skill-engine/               # Skill registry and selection
  adapters/                   # AI routing adapters + ProviderAdapters
  audit/                      # Append-only audit log writer
  events/                     # Canonical event publisher
  realtime/                   # RealtimeProvider abstraction
  storage/                    # StorageProvider (local + InsForge)
  memory/                     # Run state persistence
  healing/                    # Failure classifier + healing engine
  learning/                   # Outcome recording, reliability, adaptive policies
  observability/              # Pino logger, Prometheus metrics, OTel tracing

db/
  schema.sql                  # PostgreSQL DDL
  migrations/                 # Sequential migration files
  seeds/                      # Development seed data

config/
  skill-registry.json         # 14-entry skill registry
  policy.json                 # Command blacklisting, mode guards
  governance-policy.json      # Gate rules
  healing-policy.json         # Healing mode configuration
  routing-policy.json         # Adapter routing rules
```

---

## Key Boundary Rules

1. **Interface surfaces never bypass the control plane.** The CLI may run orchestration locally for developer workflows, but the production pattern is to treat the control-service as the stable API façade.

2. **Route handlers stay thin.** They validate input, enforce auth, call package functions, and shape responses. Business logic lives in packages.

3. **Auth is middleware, not in handlers.** `authenticate.ts` normalises all bearer strategies. `authorize.ts` enforces permissions. Handlers receive `req.auth` fully resolved.

4. **Audit writers are central.** Execution modules never write ad hoc audit shapes. They call `writeAuditEvent()` with a structured payload.

5. **Events are canonical.** Every published event includes: `actorId`, `actorType`, `orgId`, `workspaceId`, `projectId`, `authMode`, `correlationId`.

6. **The orchestrator never mints human sessions.** It accepts resolved scope from the control-service and passes it down.

7. **Adapters are scoped.** Execution adapters receive short-lived execution tokens, not long-lived user tokens.

---

## Tech Stack

| Concern | Technology | Version |
|---------|-----------|---------|
| Language | TypeScript | 5.8+ |
| Runtime | Node.js | 20 LTS |
| Module system | ESM | — |
| Package manager | pnpm | 10 |
| API framework | Express | 4.21 |
| Web UI | React + Vite | 18.3 / 5.4 |
| IDE extension | VS Code Extension API | 1.80+ |
| DB client | pg (+ Drizzle ORM planned) | 14+ |
| Auth | jsonwebtoken + jwks-rsa | — |
| Validation | Zod | 3.23 |
| Logging | Pino | planned |
| Metrics | prom-client | planned |
| Tracing | OpenTelemetry | planned |
| Testing | Vitest + Supertest | 4.1 / 7.2 |
| Containerisation | Docker | — |
| Orchestration | Kubernetes | — |
| Identity | InsForge (Supabase-based) | — |

---

## Request Lifecycle

```
1. Client sends: POST /v1/runs { idea, mode, projectId } + Bearer token

2. authenticate.ts:
   → Parse Bearer token
   → Detect: InsForge JWT / Service Account JWT / Legacy API key
   → Verify signature (JWKS or shared secret)
   → Normalise to req.auth = { actor, tenant, permissions, authMode, correlationId }

3. authorize.ts:
   → Check req.auth.permissions includes 'run:create'
   → Check req.auth.tenant.projectId matches requested projectId

4. createRun handler:
   → Validate body with Zod schema (idea required, mode enum, etc.)
   → Call runVerticalSlice({ idea, mode, scope })
   → Persist run to PostgreSQL
   → Write audit event via writeAuditEvent()
   → Publish run.created via publishEvent()
   → Return 201 { runId, status, summary, gates }

5. runVerticalSlice (packages/orchestrator):
   → intake() → planner() → skill selector → gate evaluator
   → If gates pass: execution engine → verification → outcome engine
   → If gate paused: return paused state, publish gate.awaiting_approval
```

---

## Deployment Topology

```
Production (GCP):
  ┌─────────────────┐     ┌───────────────────┐
  │  Cloud Load      │────▶│  cku-control-      │ × 2 replicas
  │  Balancer (HTTPS)│     │  service (port 7474│
  └─────────────────┘     └────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
             ┌──────────┐  ┌──────────┐  ┌────────────┐
             │ PostgreSQL│  │  Redis   │  │  InsForge  │
             │ (Cloud SQL│  │ (session │  │  (identity,│
             │   14+)   │  │  revoke) │  │  storage,  │
             └──────────┘  └──────────┘  │  realtime) │
                                         └────────────┘

Local Development (Docker Compose):
  control-service:7474 → postgres:5432
                       → redis:6379
  web-control-plane:7473 → (proxied to :7474)
```
