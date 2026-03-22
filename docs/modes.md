# Modes

Code-Kit-Ultra currently supports three execution modes.

## `safe`

Use when you want stricter governance.

Behavior:
- keeps more clarifying questions
- uses stricter gate thresholds
- is more likely to return `needs-review`
- is appropriate for cautious planning

## `balanced`

This is the default mode.

Behavior:
- keeps a moderate number of clarifying questions
- uses practical gate thresholds
- is suitable for most normal runs

## `god`

Use when you want maximum forward momentum.

Behavior:
- trims question noise more aggressively
- tolerates more ambiguity
- only blocks on more severe readiness problems

## Important note

Mode changes governance posture. It does not magically make the system smarter. The underlying pipeline remains deterministic.
