# Phase 10.5 — Self-Healing Systems

Phase 10.5 extends Code Kit Ultra with a governed recovery layer that can
diagnose common failures, choose a safe repair strategy, apply that repair,
re-verify the outcome, and retry the failed step when policy allows.

## Healing Modes
- observe
- assist
- auto

## Artifacts
- `.codekit/runs/<run-id>/healing-log.json`
- `.codekit/healing/healing-stats.json`
