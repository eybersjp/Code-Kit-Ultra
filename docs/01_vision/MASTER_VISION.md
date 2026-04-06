# Code Kit Ultra — Master Vision

**Status:** Source of Truth
**Version:** 1.2.0
**Last reviewed:** 2026-04-03

> This document is the highest-priority document in the repository. When conflicts exist between any lower-level document and this vision, this document wins.

---

## What Code Kit Ultra Is

Code Kit Ultra is an **autonomous engineering operating system**. It does not generate code in response to prompts. It accepts intent, derives structure, resolves ambiguity through governance gates, enforces policy, executes through adapters, verifies outcomes, and learns from operational results.

The product exists to close a specific failure pattern in AI-assisted development:

> Planning is fragmented. Execution is blind. Approvals are ad hoc. Verification is inconsistent. Lessons learned are never captured in a reusable way.

Code Kit Ultra replaces that pattern with a controlled lifecycle that makes runs **observable, reviewable, resumable, and auditable**.

---

## Architectural Stance

| Plane | Responsibility |
|-------|---------------|
| **InsForge** | Identity, session issuance, backend storage, realtime transport |
| **Code Kit Ultra** | Orchestration, governance, execution, verification, learning |
| **Operator surfaces** | CLI, VS Code extension, web control plane — pure clients of the control plane |

The extension, CLI, and web UI must never contain authoritative business logic. All privileged decisions are made in the control-service and orchestration layers.

---

## Product Objectives

1. Transform user intent into a structured engineering plan with explicit assumptions, clarifying questions, tasks, skills, and gates
2. Enforce governance over execution — risky actions are paused, reviewed, approved, or rejected according to policy
3. Execute through adapters (filesystem, terminal, GitHub, AI models) using a common contract
4. Verify outcomes rather than assuming success; keep a complete audit trail
5. Support InsForge-first authentication, tenant-aware scoping, and service-account automation
6. Continuously improve execution through outcome capture, reliability scoring, adaptive policy, and self-healing

---

## Explicit Non-Goals

- **Not an unconstrained autonomous agent** — every material action passes through execution, governance, and verification
- **Not a code generation endpoint** — code generation is not completion; it must be verified
- **Not a single-region active-active system** — prioritises correctness, isolation, and operational clarity over early over-optimisation
- **Not editor-dependent** — editor integrations are operator surfaces over the same control plane, not the core lifecycle

---

## Lifecycle (Source of Truth)

```
Idea Input
  → Intake Parser
  → Assumption Derivation
  → Clarifier
  → Mode Controller
  → Planner
  → Skill Selector
  → Gate Strategy Builder
  → Simulation
  → Risk Assessment
  → Approval / Auto-Proceed
  → Execution (via Adapters)
  → Verification
  → Audit Write
  → Event Publication
  → Report Generation
  → Outcome Capture
  → Learning / Self-Healing Feedback
```

---

## Governance Model

Every run passes through governance gates. Gate categories:

| Category | Gates |
|----------|-------|
| **Compliance gates** (enterprise governance) | clarity, scope, architecture, build, qa, security, cost, deployment, launch |
| **Quality gates** (execution readiness) | objective-clarity, requirements-completeness, plan-readiness, skill-coverage, ambiguity-risk |

---

## Execution Modes

| Mode | Use Case | Risk Posture |
|------|----------|--------------|
| safe | Audited, maximum oversight | Maximum pause, no command execution, dry-run always |
| balanced | Default production use | Moderate pause, command execution allowed |
| god | Trusted automation | Minimal pause, full auto-proceed |
| turbo | Rapid iteration | Minimal questions, auto-approve non-critical |
| builder | Structured projects | Architecture gate pause, medium risk pause |
| pro | Controlled with preview | Dry-run default, all gates pause |
| expert | Manual step-by-step | Stop after each phase, maximum questions |

---

## Identity and Tenancy Model

- **Root identity plane:** InsForge (unified identity and governance)
- **Canonical auth:** Bearer session tokens (InsForge JWT)
- **Machine auth:** Service accounts (scoped JWTs, narrower than human admin)
- **Legacy:** API keys — deprecated for production, local dev only

Tenancy is hierarchical: **organisation → workspace → project**. All run data is scoped to project by default.

---

## Commercial Positioning

Code Kit Ultra is not positioned as a coding assistant. It is positioned as an **autonomous engineering control plane** with measurable policy, recoverable automation, auditable actions, and defensible operator trust.

The investable differentiation:
- Policy-aware execution lifecycle (simulate → assess → approve → execute → verify)
- Separated identity and orchestration planes (enterprise trust model)
- Multi-surface operator model (CLI, extension, web share one auth and event model)
- Learning and self-healing roadmap built on scoped events and outcomes
