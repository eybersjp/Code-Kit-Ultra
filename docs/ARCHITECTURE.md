# Code Kit Ultra — System Architecture

## Overview

Code Kit Ultra (CKU) is a **governance-driven execution orchestration system** built as a **pnpm monorepo** with 13 core packages, 4 applications, and 1 IDE extension. The system enforces 9 governance gates on every execution, learns from outcomes, and supports self-healing and rollback.

**Key Design Principles:**
- **Immutable state management** — All state updates create new objects, never mutate
- **Dual audit trail** — SHA-256 hash-chain locally + InsForge for external verification
- **Mode-aware governance** — dev/staging/prod modes with different gate sequencing
- **Feedback-driven learning** — Outcomes analyzed → policies auto-updated → next run uses improved config
- **Self-healing execution** — Transient failures retry; permanent failures rollback; user approval for critical decisions

---

## System Layers

The system is organized in 4 layers:

```
┌──────────────────────────────────────────────────────┐
│   Layer 1: Clients (CLI / Web UI / IDE Extensions)   │
├──────────────────────────────────────────────────────┤
│   Layer 2: Control Service (Express API)             │
│     - Authentication (auth pkg)                       │
│     - Authorization (policy pkg)                      │
│     - Request Validation                              │
├──────────────────────────────────────────────────────┤
│   Layer 3: Execution Engine                          │
│     - Gate Evaluation (governance pkg)                │
│     - Step Orchestration (orchestrator pkg)           │
│     - Learning & Feedback (learning pkg)              │
│     - Healing & Rollback (healing pkg)                │
├──────────────────────────────────────────────────────┤
│   Layer 4: Infrastructure                            │
│     - Audit Logging (audit pkg + InsForge)           │
│     - Real-time Events (realtime pkg)                │
│     - Metrics (observability pkg)                    │
│     - PostgreSQL & Redis                             │
└──────────────────────────────────────────────────────┘
```

---

## Request Flow (Happy Path)

```
1. User submits intent via CLI/Web
2. Control-service receives POST /runs
3. Auth middleware verifies JWT (auth pkg)
4. Policy middleware checks permissions (policy pkg)
5. Handler validates request
6. Gate Manager evaluates 9 gates (governance pkg)
7. If any gate PAUSED → wait for manual approval
8. All gates PASSED → Orchestrator sequences steps
9. For each step:
   - Route intent to Skill Engine (skill-engine pkg)
   - Execute with context
   - Capture result
10. If step fails:
    - Healing Engine analyzes failure (healing pkg)
    - Select strategy: retry / rollback / skip / alert
    - Execute remediation
11. Outcome Engine analyzes run (learning pkg)
    - Classify: success / failure / partial
    - Extract patterns
    - Update reliability models
    - Trigger policy updates if patterns detected
12. Audit Log appends entry (audit pkg)
    - Emit signed context to InsForge
13. Real-time Event emitted (realtime pkg)
14. Metrics recorded (observability pkg)
15. Response returned to user
```

---

## Governance Pipeline (9 Gates)

The governance pipeline enforces 9 sequential gates:

Gate 1: SECURITY — Verify JWT token validity, check RBAC permissions
Gate 2: QUALITY — Check code coverage (>80%), verify lint status
Gate 3: OPERATIONS — Verify audit trail integrity, check operational risk score
Gate 4: PLAN APPROVAL — Human reviewer checks execution plan
Gates 5-9: CONTEXT GATES — Tenant scope, consensus voting, policy evaluation

Each gate can: PASS → continue | PAUSE → wait for approval | REJECT → fail run

---

## Package Dependency Graph

Layer 0: shared, observability, realtime (no package dependencies)
Layer 1: auth, policy, audit, agents, prompt-system (depend on shared)
Layer 2: governance, skill-engine, orchestrator, learning, healing
Layer 3: control-service, cli, web-control-plane, web-landing
Layer 4: code-kit-vscode

---

## Learning Feedback Loop

```
Run Completes
  ↓
Outcome Analyzer: Classify & extract patterns
  ↓
Policy Learner: Adjust thresholds (if patterns detected)
  ↓
Update Reliability Models
  ↓
Next Run Uses Updated Policy
```

---

## Security Model

1. Authentication — JWT tokens signed by auth service
2. Authorization (RBAC) — Roles mapped to permissions
3. Input Validation — All requests validated against schema
4. Audit Trail — Every execution logged with hash-chain
5. Secrets Management — Environment variables for API keys
6. Rate Limiting — Per-user / per-IP rate limits
7. Data Isolation — Tenant scope enforced at gate level

---

## Cross-References

**Package Documentation:**
- Phase 1: [shared](../packages/shared/CLAUDE.md), [auth](../packages/auth/CLAUDE.md), [policy](../packages/policy/CLAUDE.md), [orchestrator](../packages/orchestrator/CLAUDE.md), [governance](../packages/governance/CLAUDE.md)
- Phase 2: [audit](../packages/audit/CLAUDE.md), [agents](../packages/agents/CLAUDE.md), [realtime](../packages/realtime/CLAUDE.md), [observability](../packages/observability/CLAUDE.md), [learning](../packages/learning/CLAUDE.md), [healing](../packages/healing/CLAUDE.md), [skill-engine](../packages/skill-engine/CLAUDE.md), [prompt-system](../packages/prompt-system/CLAUDE.md)

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-26  
**Status:** Production
