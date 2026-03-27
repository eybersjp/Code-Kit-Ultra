# Phase 3: Real CLI Bootstrap

## Overview
Replaced the placeholder CLI behavior with a typed entry point that uses the shared contracts and persistence layer.

## Key Changes
- **Typed Input**: The CLI now accepts `idea`, `--mode`, and `--dry-run` with validation and normalization.
- **Persistence Wiring**: Uses `packages/memory` to record runs in `.codekit/memory/project-memory.json` and `artifacts/test-runs/`.
- **Environment Validation**: Added `validate-env` command to ensure the local environment is ready.
- **Run Metrics**: Added `metrics` command to display statistics from the project memory.

## Usage
### Initialize a Project
```bash
npm run ck init "Build an AI quoting assistant" --mode balanced --dry-run
```

### Validate Environment
```bash
npm run ck validate-env
```

### View Metrics
```bash
npm run ck metrics
```

## Success Markers
1. `init` command persists a valid `RunReport` JSON.
2. `project-memory.json` updates after each run.
3. `metrics` command reflects the actual run history.
