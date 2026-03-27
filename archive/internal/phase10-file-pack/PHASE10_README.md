# Phase 10 — Smoke Tests

This file pack adds a lightweight end-to-end smoke test for the deterministic vertical slice.

## Files included

- `examples/smoke-test.ts`
- `PHASE10_README.md`

## What the smoke test covers

The script runs four representative ideas through `runVerticalSlice(...)`:

1. Web app — `Build a CRM for solar installers`
2. Website — `Create a landing page for a solar company`
3. Automation — `Automate invoice reminders for overdue clients`
4. Agent system — `Build an AI agent that triages support tickets`

For each case, it verifies:

- the orchestrator returns a result
- `artifactDirectory`, `artifactReportPath`, and `memoryPath` are present
- the artifact report file exists
- the memory file exists
- the report contains:
  - `summary`
  - `intakeResult`
  - non-empty `plan`
  - non-empty `selectedSkills`
  - non-empty `gates`
  - valid `overallGateStatus`
- the persisted JSON also contains the expected sections
- `project-memory.json` has a non-empty `runs` array

## How to apply

Copy the files into your repo:

- `examples/smoke-test.ts`
- `PHASE10_README.md`

## How to run

From the repo root, run one of these:

```bash
pnpm tsx examples/smoke-test.ts
```

or:

```bash
npx tsx examples/smoke-test.ts
```

If you prefer to add a package script, you can wire one later, for example:

```json
{
  "scripts": {
    "smoke": "tsx examples/smoke-test.ts"
  }
}
```

Then run:

```bash
pnpm smoke
```

## Expected output shape

You should see output similar to:

```text
Starting Code-Kit-Ultra smoke test suite...

=== Smoke case: web-app ===
Idea: Build a CRM for solar installers
Gate status: needs-review
Plan tasks: 8
Selected skills: 5
Artifact: /.../artifacts/test-runs/.../run-report.json

=== Smoke case: website ===
Idea: Create a landing page for a solar company
...

=== Smoke test result ===
Completed 4 smoke cases successfully.
```

`needs-review` is acceptable if your current balanced thresholds are intentionally strict.

## Manual verification checklist

After the smoke test completes:

1. Open the newest folder in `artifacts/test-runs/`
2. Confirm each new run directory contains `run-report.json`
3. Open one report and verify it includes:
   - intake output
   - plan
   - selected skills
   - gates
   - overall gate status
4. Open `.codekit/memory/project-memory.json`
5. Confirm `runs` has grown and newest entries point to the new artifact files

## Notes

- This phase does not add any new business logic.
- It validates the existing deterministic pipeline from the outside.
- It is intended to catch regressions quickly after changes to intake, planner, selector, gates, or orchestrator wiring.
