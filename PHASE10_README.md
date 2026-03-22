# Phase 10 — Smoke Tests

This file pack adds a lightweight end-to-end smoke test for the deterministic vertical slice.

## Overview
The smoke test suite verifies the reliability and regression-safety of the deterministic vertical slice across diverse project categories.

## What the smoke test covers
The script runs four representative ideas through `runVerticalSlice(...)`:
1. Web app — `Build a CRM for solar installers`
2. Website — `Create a landing page for a solar company`
3. Automation — `Automate invoice reminders for overdue clients`
4. Agent system — `Build an AI agent that triages support tickets`

For each case, it verifies:
- The orchestrator returns a result.
- `artifactDirectory`, `artifactReportPath`, and `memoryPath` are present.
- The artifact report file exists.
- The memory file exists.
- The report contains `summary`, `intakeResult`, non-empty `plan`, non-empty `selectedSkills`, non-empty `gates`, and a valid `overallGateStatus`.
- The persisted JSON also contains the expected sections.
- `project-memory.json` has a non-empty `runs` array.

## How to run
From the repo root, run:
```bash
pnpm tsx examples/smoke-test.ts
```
or
```bash
npx tsx examples/smoke-test.ts
```

## Expected output shape
```text
Starting Code-Kit-Ultra smoke test suite...

=== Smoke case: web-app ===
Idea: Build a CRM for solar installers
Gate status: needs-review
Plan tasks: 8
Selected skills: 6
Artifact: /.../artifacts/test-runs/.../run-report.json

...

=== Smoke test result ===
Completed 4 smoke cases successfully.
```

## Manual verification checklist
After the smoke test completes:
1. Open the newest folder in `artifacts/test-runs/`.
2. Confirm each new run directory contains `run-report.json`.
3. Open one report and verify it includes: `intakeResult`, `plan`, `selectedSkills`, `gates`, and `overallGateStatus`.
4. Open `.codekit/memory/project-memory.json`.
5. Confirm `runs` has grown and newest entries point to the new artifact files.
