# Getting Started

## 1. Install dependencies

```bash
pnpm install
```

## 2. Validate the repository

```bash
pnpm typecheck
pnpm tsx examples/smoke-test.ts
```

## 3. Run a manual CLI example

```bash
pnpm ck init "Build a CRM for solar installers" --mode balanced --dry-run
```

## 4. Inspect the generated files

You should see:

```text
.codekit/memory/project-memory.json
artifacts/test-runs/<timestamp>/run-report.json
```

## 5. Understand the output

A typical run report includes:

- `input`
- `intakeResult`
- `plan`
- `selectedSkills`
- `gates`
- `overallGateStatus`
- `summary`

## Common development loop

```bash
pnpm typecheck
pnpm tsx examples/smoke-test.ts
pnpm ck init "Create a landing page for a solar company" --mode safe
```

## Troubleshooting

### The CLI runs but no artifact appears
Check that the current working directory is the repo root. The persistence layer writes relative to the repo root.

### Smoke tests fail
Run typecheck first. Then inspect the smoke test output to see which section is missing or malformed.

### The gate result is `needs-review`
That can be expected. The gate layer is intentionally conservative in `safe` and `balanced` modes.
