
# Code Kit Ultra — Repo Gap Audit and Public GitHub Sync Plan

Date: 2026-03-24

## Executive summary

The current public repository is a strong **early public vertical slice**, but it still lags behind the architecture and operational capabilities now implemented internally.

Public GitHub currently presents Code Kit Ultra as an AI operating system with governed orchestration, rollback safety, and organization-ready workflows. In practice, the shipped public repo is still centered on a **single `init`-driven vertical slice**, with older mode names and a narrower CLI surface.

The highest-priority work is to align the public repository with the real system:
1. move to the `/ck-*` namespaced command protocol
2. replace `safe | balanced | god` with `turbo | builder | pro | expert`
3. publish the operational execution stack (`.ck/*`, queueing, previewing, approvals, rollback)
4. realign docs, roadmap, architecture, and release notes around governed autonomous execution

---

## Current public repo snapshot

### What public GitHub currently shows
- Repo branding: **"Code Kit Ultra: The AI Operating System for Product Delivery"**
- Public repo structure includes:
  - `apps/cli`
  - `packages/adapters`
  - `packages/memory`
  - `packages/observability`
  - `packages/orchestrator`
  - `packages/shared`
  - `packages/skill-engine`
- README onboarding still centers on:
  - `npm run ck -- init "..."`
  - `codekit init "..."`
- Public claims include:
  - governed orchestration
  - rollback safety
  - multi-adapter support
  - organization-ready positioning

### What the attached repo confirms
- CLI currently exposes:
  - `init`
  - `validate-env`
  - `metrics`
- CLI mode normalization still uses:
  - `safe`
  - `balanced`
  - `god`
- Package version is `1.0.3`
- CLI version is `1.0.3`
- Docs architecture is still high-level:
  - mode controller
  - runtime selector
  - governance and audit
  - memory and observability

---

## Gap assessment

## P0 — Critical sync gaps

### 1. Command protocol mismatch
**Current public state**
- public CLI uses plain commands like `init`
- docs still show `npm run ck -- init "..."`

**Target state**
- namespaced commands:
  - `/ck-init`
  - `/ck-run`
  - `/ck-mode`
  - `/ck-approve`
  - `/ck-pending`
  - `/ck-approve-batch`
  - `/ck-preview`
  - `/ck-resume`
  - `/ck-rollback`

**Why this matters**
- avoids collision with other agent systems
- establishes Code Kit Ultra as a portable command protocol
- aligns with Antigravity and future multi-surface execution

**Files to update**
- `apps/cli/src/index.ts`
- `README.md`
- `docs/QUICKSTART.md`
- `docs/FIRST_RUN_TUTORIAL.md`
- `docs/INSTALL_IN_10_MINUTES.md`
- `FAQ.md`

---

### 2. Mode system mismatch
**Current public state**
- `safe | balanced | god`

**Target state**
- `turbo | builder | pro | expert`

**Why this matters**
- current labels are older and less intuitive
- new labels map directly to autonomy/control depth
- mode behavior is now much richer than the public naming suggests

**Files to update**
- `packages/shared/src/*` or equivalent mode types
- `packages/orchestrator/src/mode-controller.ts`
- `apps/cli/src/index.ts`
- `config/profiles/*`
- `README.md`
- `ROADMAP.md`
- `docs/ARCHITECTURE.md`

---

### 3. Public feature claims exceed shipped public UX
**Current public state**
README markets:
- governed orchestration
- governed promotion
- rollback safety
- organization-ready behavior

**But public repo still lacks visible operational UX for**
- batch approval queue
- action previews
- resumable paused runs
- rollback commands
- action execution approvals
- queued risky batches

**Required fix**
Either:
1. publish the operational layer now, or
2. soften claims until the public repo truly ships it

**Files to update**
- `README.md`
- `LAUNCH.md`
- `ANNOUNCEMENT.md`
- `RELEASE_NOTES_v1.0.3.md`
- `docs/FEATURE_MATRIX.md`

---

## P1 — Public architecture gaps

### 4. Persistence structure is outdated publicly
**Current public mental model**
- `.codekit/*`
- older memory/artifact conventions

**Target state**
- `.ck/runs/`
- `.ck/artifacts/`
- `.ck/logs/`
- `.ck/queue/`

**Why this matters**
- current internal architecture depends on these locations
- the public docs should match runtime reality
- contributors need one canonical persistence model

**Files to update**
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/RUNBOOK.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/ROLLBACK.md`
- `.gitignore`

---

### 5. Public package map is missing major operational packages
**Current public package surface**
- adapters
- memory
- observability
- orchestrator
- shared
- skill-engine

**Now needed publicly**
- `packages/command-engine`
- `packages/agents`
- `packages/gates`
- `packages/security`
- `packages/tools`
- upgraded orchestrator support for queueing, preview, resume, rollback

**Files/folders to add**
- `packages/command-engine/`
- `packages/agents/`
- `packages/gates/`
- `packages/security/`
- `packages/tools/`

---

### 6. Execution is still perceived publicly as planning/reporting
**Current public behavior**
- vertical slice report
- assumptions
- clarifying questions
- plan
- skills
- gates

**Needed public behavior**
- real action batches
- guarded execution
- queue/approve/execute flow
- previews and rollback

**Files to update**
- `packages/orchestrator/src/*`
- `apps/cli/src/index.ts`
- `examples/*`
- demo scripts in `scripts/`

---

## P2 — Operational trust gaps

### 7. No public diff preview system yet
**Needed**
- exact file create/modify preview
- line-level diffs where possible
- preview artifact before execution

**Files to add**
- `packages/orchestrator/src/diff-preview.ts`
- `packages/command-engine/src/handlers/diff.ts`

---

### 8. No public provenance / signing layer yet
**Needed**
- batch provenance metadata:
  - generatedByAgent
  - sourcePhase
  - sourceArtifact
  - hash
  - approvedBy
  - approvedAt
- optional signature verification before execution

**Files to add**
- `packages/security/src/batch-provenance.ts`
- `packages/security/src/batch-signing.ts`
- `packages/command-engine/src/handlers/verify-batch.ts`

---

### 9. Rollback is not yet snapshot-grade
**Current direction**
- best-effort rollback metadata

**Needed**
- pre-change file backup
- restore engine
- stronger overwrite recovery

**Files to add**
- `packages/orchestrator/src/file-backup.ts`
- `packages/orchestrator/src/restore-engine.ts`

---

### 10. No normalized run ledger/event stream
**Needed**
- event-grade observability
- replay/debugging
- UI timeline support
- analytics-friendly history

**Files to add**
- `packages/core/src/run-ledger.ts`

---

## P3 — Product positioning and contributor experience gaps

### 11. README positioning needs an architecture refresh
The README should stop sounding like a generic AI builder and explicitly define CK Ultra as:

> a governed, multi-agent AI execution system for building software safely, autonomously, and reproducibly

**Sections to rewrite**
- hero/value proposition
- getting started
- command model
- mode system
- safety model
- repo structure
- roadmap

---

### 12. Roadmap is behind the real system
Current roadmap is still too marketing-shaped and not execution-layer specific.

It should explicitly show:
- v0.1 foundation
- v0.2 controlled execution
- v0.3 governed execution
- v0.4 trust & safety
- v0.5 LLM agent intelligence
- v0.6 tool ecosystem
- v0.7 team workflows
- v1.0 production platform

**Files to update**
- `ROADMAP.md`
- `README.md`
- `RELEASE_NOTES*.md`

---

### 13. Public examples are likely too old for the new architecture
Need examples for:
- fast build flow
- approval-required flow
- queue/preview/approve flow
- rollback flow
- expert-mode step-by-step flow

**Files/folders to add**
- `examples/ck-run-quickstart/`
- `examples/approval-flow/`
- `examples/preview-and-queue/`
- `examples/rollback-demo/`
- `examples/expert-mode/`

---

## Recommended public release roadmap

## Release A — Public Sync Release
Goal: align docs and CLI naming with the real product direction

### Include
- `/ck-*` command protocol
- new mode names
- README refresh
- roadmap refresh
- architecture refresh
- `.ck/*` persistence docs

### Suggested version
- `v1.1.0` if you want continuity
- or `v0.4.0` if you want to reframe around maturity stages

---

## Release B — Operational Layer Release
Goal: publish real governed execution capabilities

### Include
- command engine
- gates
- agents
- tools
- security
- queue/preview/approval
- resume/rollback
- examples

### Suggested release message
> Code Kit Ultra now supports governed workspace execution with previews, approvals, resumable runs, and rollback support.

---

## Release C — Trust & Audit Release
Goal: harden execution for broader public trust

### Include
- diff previews
- provenance metadata
- signing
- run ledger
- snapshot restore

---

## Exact implementation checklist

## Must add
- `packages/command-engine/`
- `packages/agents/`
- `packages/gates/`
- `packages/security/`
- `packages/tools/`
- `packages/orchestrator/src/batch-queue.ts`
- `packages/orchestrator/src/execution-preview.ts`
- `packages/orchestrator/src/resume-run.ts`
- `packages/orchestrator/src/rollback-engine.ts`
- `packages/orchestrator/src/action-runner.ts`

## Must update
- `apps/cli/src/index.ts`
- `README.md`
- `ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURE_MATRIX.md`
- `docs/RUNBOOK.md`
- `docs/ROLLBACK.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/QUICKSTART.md`
- `docs/FIRST_RUN_TUTORIAL.md`
- `FAQ.md`
- `LAUNCH.md`
- `.gitignore`

## Should add next
- `packages/orchestrator/src/diff-preview.ts`
- `packages/security/src/batch-provenance.ts`
- `packages/security/src/batch-signing.ts`
- `packages/core/src/run-ledger.ts`
- `packages/orchestrator/src/file-backup.ts`
- `packages/orchestrator/src/restore-engine.ts`

---

## Suggested public GitHub milestone structure

### Milestone 1 — Command & Mode Sync
- migrate to `/ck-*`
- migrate to `turbo | builder | pro | expert`
- update CLI docs and examples

### Milestone 2 — Governed Execution
- publish action runner
- publish queue/preview/approval
- publish resume and rollback commands

### Milestone 3 — Trust Layer
- diff previews
- provenance/signing
- backup/restore
- run ledger

### Milestone 4 — Real Adapters
- Antigravity executor
- real LLM prompt runner
- real tool-backed build path

---

## Recommended GitHub issues to open immediately

1. Replace legacy CLI commands with `/ck-*` namespaced command protocol
2. Replace legacy mode model with `turbo | builder | pro | expert`
3. Add public command-engine package
4. Add public agents package
5. Add public gates package
6. Add public security package
7. Add public tools package
8. Add `.ck/*` persistence and artifact documentation
9. Publish queue/preview/approval CLI flow
10. Publish resume and rollback command flow
11. Add diff preview engine
12. Add provenance and batch signing
13. Add snapshot-based rollback and restore
14. Refresh README, ROADMAP, and ARCHITECTURE docs
15. Add new examples for quick, approval, and expert workflows

---

## Final recommendation

Do not market the public repo as a fully governed autonomous execution platform until the public command surface and operational layer are visible in GitHub.

The strongest next move is a **public sync release**:
- bring repo naming, docs, commands, and modes into alignment
- then publish the operational layer in the next release
- then harden trust with diffs/provenance/signatures/backups

That sequence will make the GitHub repo credible, attractive, and contributor-ready.
