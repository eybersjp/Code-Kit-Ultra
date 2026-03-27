# Phase 4: Intake and Clarification

This pack adds a deterministic intake layer for Code-Kit-Ultra.

## Files included

- `packages/orchestrator/src/intake.ts`
- `packages/orchestrator/src/index.ts`

## What this phase does

The intake module:

- normalizes the raw idea text
- infers a rough solution category
- generates deterministic assumptions
- generates deterministic clarifying questions
- returns a typed `ClarificationResult`

## Key exported functions

- `normalizeIdeaText(rawIdea)`
- `inferSolutionCategory(input)`
- `deriveIntakeSignals(input)`
- `deriveAssumptions(input)`
- `generateClarifyingQuestions(input)`
- `runIntake(input)`

## Suggested test file

Create a temporary file in the repo root called `tmp-phase4-test.ts`.

```ts
import { runIntake } from "./packages/orchestrator/src";

const examples = [
  {
    idea: "Build a CRM for solar installers",
    mode: "balanced",
    deliverable: "app",
  },
  {
    idea: "Create an internal workflow automation for onboarding new staff with React and Supabase",
    mode: "safe",
    deliverable: "automation",
  },
];

for (const input of examples) {
  const result = runIntake(input as any);
  console.log(JSON.stringify(result, null, 2));
}
```

## Test commands

```bash
pnpm typecheck
pnpm tsx tmp-phase4-test.ts
```

## Expected behavior

### Example 1
Input:

```text
Build a CRM for solar installers
```

Expected shape:

- inferred category should be `app`
- assumptions should include web-first and MVP-style defaults
- questions should ask about users, business model, stack, auth, and deployment target

### Example 2
Input:

```text
Create an internal workflow automation for onboarding new staff with React and Supabase
```

Expected shape:

- inferred category should be `automation` or `internal-tool` depending on your preferred priority rules
- assumptions should be fewer because stack and business context are already present
- questions should mainly focus on auth and deployment scope if not already stated

## Manual verification checklist

- confirm `packages/orchestrator/src/intake.ts` compiles cleanly
- confirm `runIntake()` returns deterministic output for the same input
- confirm no AI or network calls are used
- confirm assumptions are useful but not excessive
- confirm clarifying questions are specific and practical

## Notes

This phase deliberately does **not** add:

- planner logic
- gate logic
- skill selection
- adapters
- full orchestrator flow

It only adds the deterministic intake layer needed for Phase 5.
