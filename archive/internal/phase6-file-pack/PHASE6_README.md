# Phase 6 — Skill Registry + Selector

This file pack adds a deterministic, file-driven skill engine for Code-Kit-Ultra.

## Files included

- `config/skill-registry.json`
- `packages/skill-engine/src/selector.ts`
- `packages/skill-engine/src/index.ts`

## What this phase does

It introduces:

- a transparent skill registry stored in JSON
- deterministic skill scoring against intake + planner outputs
- selected skills returned with repeatable reasons
- a fallback skill when no specialist entry crosses the threshold

## Selection inputs

The selector expects:

- `clarification: ClarificationResult`
- `plan: Task[]`

## Main exports

- `loadSkillRegistry(options?)`
- `selectSkills({ clarification, plan }, options?)`
- `selectSkillsFromClarification(clarification, plan, options?)`
- `explainSkillSelection({ clarification, plan }, options?)`

## Scoring model

Each skill gets a deterministic score from:

- project-type match
- keyword matches in the clarified objective
- keyword matches in the generated plan
- plan task-id trigger matches
- a small priority bonus

## Expected fit with earlier phases

This pack is designed to work after:

- Phase 1: shared types
- Phase 2: memory
- Phase 3: CLI bootstrap
- Phase 4: intake
- Phase 5: planner

## Test script example

Create `tmp_phase6_test.ts` at the repo root:

```ts
import { runIntake } from "./packages/orchestrator/src";
import { buildPlanFromClarification } from "./packages/orchestrator/src";
import {
  explainSkillSelection,
  selectSkillsFromClarification,
} from "./packages/skill-engine/src";

const websiteClarification = runIntake({
  idea: "Build a landing page for an AI automation consultancy with SEO and lead capture",
  mode: "balanced",
});

const websitePlan = buildPlanFromClarification(websiteClarification);
const websiteSkills = selectSkillsFromClarification(websiteClarification, websitePlan);

console.log("WEBSITE SKILLS");
console.log(websiteSkills);

const agentClarification = runIntake({
  idea: "Build an AI agent system that qualifies solar leads and updates the CRM automatically",
  mode: "balanced",
});

const agentPlan = buildPlanFromClarification(agentClarification);
const agentSkills = selectSkillsFromClarification(agentClarification, agentPlan);

console.log("AGENT SKILLS");
console.log(agentSkills);

console.log("TOP SCORE BREAKDOWN");
console.log(explainSkillSelection({ clarification: agentClarification, plan: agentPlan }).slice(0, 5));
```

## Commands to test

```bash
pnpm typecheck
pnpm tsx tmp_phase6_test.ts
```

If you use npm:

```bash
npm run typecheck
npx tsx tmp_phase6_test.ts
```

## Expected sample behavior

### Website-style input
Likely selected skills:

- `architecture-planning`
- `landing-page-copy-ux`
- `deployment-readiness`
- `testing-foundation`
- `typescript-monorepo`

### AI-agent automation input
Likely selected skills:

- `agent-orchestration`
- `workflow-automation`
- `integration-mapping`
- `crm-workflows`
- `architecture-planning`

The exact ordering can vary only if you change the registry or thresholds. For the same code and same inputs, the output stays deterministic.

## Manual verification checklist

- Confirm `config/skill-registry.json` exists and is valid JSON.
- Confirm the selector can load the registry from the repo root.
- Confirm different project types produce different selected skills.
- Confirm the reasons are human-readable and repeatable.
- Confirm a fallback skill appears if the threshold is raised very high.

## Optional note

If your monorepo requires explicit workspace registration for new packages, add `packages/skill-engine` to the workspace config before typechecking.
