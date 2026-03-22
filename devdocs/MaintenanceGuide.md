# Maintenance & System Administrator Guide

## 1. Routine Maintenance

### 1.1 Artifact Cleanup
Every orchestration run creates a new timestamped directory in `artifacts/test-runs/`. Large deployments with thousands of runs should be pruned.
- **Action**: Delete old directories in `artifacts/test-runs/` periodically.
- **Note**: Deleting these will make the "artifact report path" links in `project-memory.json` dead.

### 1.2 Dependency Management
The system relies on `tsx` for execution. Ensure the global or local `tsx` remains on a compatible version (`^4.x.x`).
- **Action**: Run `npm update tsx typescript` quarterly.

## 2. Troubleshooting Core Services

### 2.1 The CLI command `ck` is missing
Ensure `npm link` was run or follow the path directly via `npx tsx apps/cli/src/index.ts`.

### 2.2 Skill selection is consistently returning "Fallback"
This typically means the keyword density in the `idea` is too low or the `registry` doesn't cover that category.
- **Check**: Run `ck init "..." --mode god` to lower the threshold.
- **Update**: Add relevant keywords/project-types to `config/skill-registry.json`.

## 3. Log Ingestion
System logs are in newline-delimited JSON.
- **Location**: Printed to `stdout` (info/debug) and `stderr` (warn/error).
- **Format**: `{"level":"...","message":"...", "timestamp":"..."}`
- **Integration**: Pipe to a file: `ck init "..." > run.log 2> error.log`.
