# Phase 7 — Gate System

This pack adds a deterministic gate layer for Code-Kit-Ultra.

## Files
- `packages/orchestrator/src/gate-manager.ts`
- `packages/orchestrator/src/index.ts`

## What it does
The gate manager evaluates a run using:
- clarification quality
- open question count
- ambiguity / assumption load
- plan readiness
- skill coverage
- optional mode sensitivity

It returns:
- `GateDecision[]`
- `overallStatus`
- summary text

## Main API

```ts
import { evaluateGates } from "./packages/orchestrator/src";
```

### Example

```ts
import type { ClarificationResult, SelectedSkill, Task } from "./packages/shared/src";
import { evaluateGates } from "./packages/orchestrator/src";

const clarificationResult = {
  normalizedObjective: "Build a quoting platform for solar EPC teams",
  projectCategory: "web-app",
  assumptions: [
    { text: "This is a multi-user B2B tool." },
    { text: "A web-first interface is preferred." },
  ],
  clarifyingQuestions: [
    { text: "Who are the primary user roles?" },
    { text: "Is this MVP scope or production scope?" },
  ],
  confidence: 0.74,
} as ClarificationResult;

const plan = [
  {
    id: "clarify-scope",
    title: "Clarify scope",
    description: "Confirm goals and constraints.",
    status: "pending",
    dependencies: [],
  },
  {
    id: "define-architecture",
    title: "Define architecture",
    description: "Map the technical structure.",
    status: "pending",
    dependencies: ["clarify-scope"],
  },
  {
    id: "implementation-path",
    title: "Choose implementation path",
    description: "Select the execution route.",
    status: "pending",
    dependencies: ["define-architecture"],
  },
  {
    id: "reporting",
    title: "Prepare report",
    description: "Summarize the run.",
    status: "pending",
    dependencies: ["implementation-path"],
  },
] as Task[];

const selectedSkills = [
  {
    id: "architecture-planning",
    name: "Architecture Planning",
    category: "architecture",
    score: 9,
    reason: "Matched the web-app project type and architecture tasks.",
  },
  {
    id: "crm-workflows",
    name: "CRM Workflows",
    category: "domain",
    score: 8,
    reason: "Matched quoting and CRM task patterns.",
  },
] as SelectedSkill[];

const result = evaluateGates({
  clarificationResult,
  plan,
  selectedSkills,
  mode: "balanced",
});

console.log(result.overallStatus);
console.log(result.decisions);
console.log(result.summary);
```

## Quick test script

Create `tmp-phase7-test.ts` at the repo root:

```ts
import type { ClarificationResult, SelectedSkill, Task } from "./packages/shared/src";
import { evaluateGates } from "./packages/orchestrator/src";

const strongClarification = {
  normalizedObjective: "Build a multi-tenant SaaS quoting platform for solar EPC teams",
  projectCategory: "web-app",
  assumptions: [
    { text: "The app is web-first." },
    { text: "The product is multi-user." },
    { text: "Role-based access is required." },
  ],
  clarifyingQuestions: [
    { text: "Which roles need access first?" },
    { text: "Should the system include proposal generation in v1?" },
  ],
  confidence: 0.78,
} as ClarificationResult;

const weakClarification = {
  normalizedObjective: "Build something with AI",
  projectCategory: "unknown",
  assumptions: [
    { text: "Maybe it is a chatbot." },
    { text: "Maybe it is a workflow tool." },
    { text: "Maybe it is a web app." },
    { text: "Maybe it needs integrations." },
    { text: "Maybe it needs auth." },
    { text: "Maybe it needs analytics." },
    { text: "Maybe it needs documents." },
  ],
  clarifyingQuestions: [
    { text: "Who is it for?" },
    { text: "What does it do?" },
    { text: "What platform should it run on?" },
    { text: "What is the main workflow?" },
    { text: "Does it need logins?" },
    { text: "Does it need integrations?" },
    { text: "Should it be web or mobile?" },
  ],
  confidence: 0.22,
} as ClarificationResult;

const strongPlan = [
  { id: "clarify-scope", title: "Clarify scope", description: "Confirm goals.", status: "pending", dependencies: [] },
  { id: "define-architecture", title: "Define architecture", description: "Map structure.", status: "pending", dependencies: ["clarify-scope"] },
  { id: "select-skills", title: "Select skills", description: "Choose skills.", status: "pending", dependencies: ["define-architecture"] },
  { id: "validate-risks", title: "Validate risks", description: "Review gaps.", status: "pending", dependencies: ["select-skills"] },
  { id: "implementation-path", title: "Implementation path", description: "Choose route.", status: "pending", dependencies: ["validate-risks"] },
] as Task[];

const weakPlan = [
  { id: "do-work", title: "Do work", description: "Build something.", status: "pending", dependencies: [] },
] as Task[];

const strongSkills = [
  { id: "architecture-planning", name: "Architecture Planning", category: "architecture", score: 10, reason: "Strong architecture match." },
  { id: "saas-multitenancy", name: "SaaS Multitenancy", category: "domain", score: 9, reason: "Strong SaaS match." },
  { id: "typescript-monorepo", name: "TypeScript Monorepo", category: "engineering", score: 8, reason: "Monorepo match." },
] as SelectedSkill[];

const weakSkills = [
  { id: "fallback-scaffold", name: "Fallback Scaffold", category: "fallback", score: 1, reason: "Low-confidence fallback." },
] as SelectedSkill[];

console.log("=== Strong case ===");
console.log(
  evaluateGates({
    clarificationResult: strongClarification,
    plan: strongPlan,
    selectedSkills: strongSkills,
    mode: "balanced",
  }),
);

console.log("=== Weak case ===");
console.log(
  evaluateGates({
    clarificationResult: weakClarification,
    plan: weakPlan,
    selectedSkills: weakSkills,
    mode: "safe",
  }),
);
```

## Test commands

```bash
pnpm typecheck
pnpm tsx tmp-phase7-test.ts
```

## Expected behavior

### Strong case
- overall status should usually be `pass`

### Weak case
- overall status should usually be `blocked`

## Manual verification checklist
- Confirm every gate decision includes a status and reason.
- Confirm overall status changes when ambiguity gets worse.
- Confirm `safe` mode is stricter than `balanced`.
- Confirm weak skill coverage causes `needs-review` or `blocked`.
- Confirm no AI calls or external dependencies were introduced.
