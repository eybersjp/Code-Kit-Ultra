# Service Boundaries

## apps/control-service
Primary authenticated API surface.

### Responsibilities
- validate InsForge access tokens
- resolve tenant context
- authorize user actions
- expose run / gate / audit / timeline APIs
- mint short-lived internal execution tokens
- serve extension and web control plane

### Must not own
- direct adapter execution
- long-running worker logic
- heavy learning batch jobs

## packages/orchestrator
Core workflow brain.

### Responsibilities
- intake to plan transition
- gate sequencing
- run state orchestration
- dependency handoff to execution, policy, learning, audit

## packages/execution
Execution worker interfaces and runtime.

### Responsibilities
- simulation
- risk evaluation
- execution
- verification
- rollback
- healing integration

## packages/policy
Authorization and execution policy logic.

### Responsibilities
- role-to-permission mapping
- gate rules
- adapter restrictions
- escalation conditions
- policy overlays per org/workspace/project

## packages/audit
Immutable event and decision recording.

### Responsibilities
- audit entity schema
- signed action traces
- correlation IDs
- operator approval recording
- export helpers

## packages/auth
InsForge integration boundary.

### Responsibilities
- JWT verification
- session resolution
- org/workspace/project claims mapping
- service-account auth
- action-token issuance

## packages/realtime
Push and subscription layer.

### Responsibilities
- event publishing abstraction
- channel naming
- client subscription contract
- replay and timeline fanout helpers

## packages/learning
Phase 10+ learning systems.

### Responsibilities
- outcome ingestion
- failure pattern extraction
- reliability scoring
- adaptive policy recommendations
