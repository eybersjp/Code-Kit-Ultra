# Code Kit Ultra — Phase 6 ULTRA

Phase 6 adds **self-tuning governance** on top of the existing governed autonomy, observability, and adaptive specialist-agent stack.

## What this pack adds

- Outcome feedback engine
- Agent reliability evolution
- Threshold policy learning
- Constraint policy suggestions
- Skill performance learning
- Learning report generation
- Memory graph event model
- CLI handlers for Phase 6 commands
- Integration snippets for the orchestrator
- Smoke test

## New commands

- `/ck-outcome <json>`
- `/ck-learning-report`
- `/ck-agent-evolution <agent>`
- `/ck-policy-diff`
- `/ck-skill-learning`

## Suggested pipeline after Phase 6

```text
intent
-> constraints
-> validation
-> specialist voting
-> adaptive consensus
-> confidence
-> kill switch
-> execute/block
-> trace + timeline
-> outcome capture
-> learning update
-> evolved policies / agent profiles / skill weights
```

## Installation flow

1. Merge this pack after Phase 4 and Phase 5.
2. Copy the `packages/learning` package into your monorepo.
3. Add the new shared types from `packages/shared/src/phase6-types.ts`.
4. Register the CLI handlers in `apps/cli/src/index.ts`.
5. Call `recordRunOutcome()` after governed execution ends.
6. Call `applyLearningCycle()` after outcome recording.
7. Persist the updated agent profiles and threshold policies.

## Safety principles

- Reliability updates are capped per run.
- Thresholds can only shift within bounded ranges.
- Constraint tightening is suggested first, not auto-enforced blindly.
- Human override events are preserved as first-class learning signals.
