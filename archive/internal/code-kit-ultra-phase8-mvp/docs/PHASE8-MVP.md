# Phase 8 Governed Execution MVP

## Goals

1. Replace thin mock routing with a provider adapter contract.
2. Persist execution state per run so the IDE control plane can inspect and resume runs.
3. Introduce retries, rollback, and pause-on-approval logic.
4. Produce an execution log that is useful for control panels, audits, and postmortems.

## Included capabilities

- deterministic intake and planning
- mode-aware gate evaluation
- resumable execution state
- file-system writes for generated project scaffolds
- safe terminal dry-run support
- provider adapter registry
- markdown and JSON report generation
- CLI commands for init, inspect, resume, approve

## Deliberately not included

- remote credential handling
- real GitHub commits or PR creation
- external API mutation
- editor automation APIs
- marketplace / plugin distribution

## Success criteria

- a run is saved under `.codekit/runs/<run-id>/`
- a run can pause for approval and later resume
- failed steps can retry
- rollback handlers run when required
- artifact files match IDE-native expectations
