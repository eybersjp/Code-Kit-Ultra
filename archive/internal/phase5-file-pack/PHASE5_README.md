# Phase 5 — Planner

This pack adds a deterministic planner for Code-Kit-Ultra.

## Files included

- `packages/orchestrator/src/planner.ts`
- `packages/orchestrator/src/index.ts`

## What it does

The planner converts a `ClarificationResult` into a stable ordered `Task[]`.

It always generates a core planning sequence:

1. clarify scope
2. define architecture
3. identify skills
4. validate risks
5. choose implementation path
6. prepare execution report

It also inserts category-specific tasks for:

- web apps
- websites
- automations
- AI agents
- APIs

## Main exports

```ts
buildPlan({ clarification })
buildPlanFromClarification(clarification)
```

## Example usage

Create a quick test file such as `tmp-phase5-test.ts` at the repo root:

```ts
import { buildPlanFromClarification } from "./packages/orchestrator/src";
import type { ClarificationResult } from "./packages/shared/src";

const crmInput = {
  normalizedObjective: "Build a CRM for solar installers",
  projectType: "web-app",
  assumptions: [
    { label: "Likely web app", rationale: "CRM systems are commonly browser-based" },
    { label: "Likely multi-user", rationale: "CRM systems usually support teams" }
  ],
  clarifyingQuestions: [
    { question: "Which user roles are needed?", priority: "high" },
    { question: "Is this MVP or full production scope?", priority: "high" }
  ]
} as ClarificationResult;

const agentInput = {
  normalizedObjective: "Build an AI research agent for tender discovery",
  projectType: "ai-agent",
  assumptions: [
    { label: "Uses external tools", rationale: "Research agents usually need search and retrieval" }
  ],
  clarifyingQuestions: [
    { question: "Should the agent autonomously act or only recommend?", priority: "high" }
  ]
} as ClarificationResult;

console.log("CRM PLAN");
console.log(buildPlanFromClarification(crmInput));

console.log("\nAGENT PLAN");
console.log(buildPlanFromClarification(agentInput));
```

## Test commands

```bash
pnpm typecheck
pnpm tsx tmp-phase5-test.ts
```

Or if your repo uses npm:

```bash
npm run typecheck
npx tsx tmp-phase5-test.ts
```

## Expected behavior

For a CRM/web-app input, you should see tasks including:

- `clarify-scope`
- `define-architecture`
- `identify-skills`
- `validate-risks`
- `design-core-user-flows`
- `plan-delivery-slices`
- `choose-implementation-path`
- `prepare-execution-report`

For an AI-agent input, you should see tasks including:

- `clarify-scope`
- `define-architecture`
- `identify-skills`
- `validate-risks`
- `define-agent-workflows`
- `design-evaluation-safety`
- `choose-implementation-path`
- `prepare-execution-report`

## Manual verification checklist

- Confirm planner output is deterministic for the same input.
- Confirm all task IDs are stable and readable.
- Confirm dependencies only reference earlier tasks.
- Confirm category-specific tasks appear for the right project type.
- Confirm `choose-implementation-path` depends on the relevant category tasks.
