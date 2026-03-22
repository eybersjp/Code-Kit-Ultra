# Phase 12 — Release Hardening

This phase hardens the repository for v1.0.1 by aligning documentation with implementation reality and ensuring validation is smooth.

## Overview
The repository is now a fully functional vertical slice of a deterministic orchestration pipeline. This phase ensures that the README and supporting docs tell the truth about what is currently implemented (governance, planning, modes, mock adapters) and what is not (live external APIs).

## What changed
- **README.md**: Completely rewritten to reflect the implementation status, architecture, and validation commands.
- **Documentation**: Added `docs/getting-started.md`, `docs/architecture.md`, `docs/modes.md`, and `docs/adapters.md`.
- **Cleanup**: Verified all exports and scripts match the documented paths.

## Final Validation
To verify the hardened release:

1. **Typecheck**:
   ```bash
   pnpm typecheck
   ```

2. **Smoke Tests**:
   ```bash
   pnpm tsx examples/smoke-test.ts
   ```

3. **CLI Init**:
   ```bash
   pnpm ck init "Build a CRM for solar installers" --mode balanced --dry-run
   ```

## Repository Readiness
The repository is now ready for handoff or public use as a deterministic orchestration starter.
