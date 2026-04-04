# SPEC — AI Model Routing Adapters

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/ADAPTER_ARCHITECTURE.md`
**Implements:** Undocumented feature — formalises existing implementation

---

## Objective

Formally document the six AI model routing adapters implemented in `packages/adapters/src/`. These are distinct from the platform execution adapters (filesystem, terminal, GitHub) and serve to route orchestration work to the best-fit AI model for the task type.

---

## Concept

The repository implements a dual adapter system. This spec covers the AI routing layer:

| System | Purpose | Base Interface |
|--------|---------|----------------|
| **AI Routing Adapters** (this spec) | Select and invoke the right AI model for plan, code, scaffold tasks | `PlatformAdapter` |
| **Provider Adapters** | Execute concrete actions on filesystem, terminal, GitHub | `ProviderAdapter` |

---

## AI Adapter Catalog

### Claude (`claude-adapter.ts`)
- **Fit score base:** 95
- **Strengths:** Rust, Go, C++, embedded, low-level, math, algorithms
- **Capabilities:** planning, scaffolding, code-editing, refactoring, contextual-iteration
- **Use when:** Complex technical reasoning, multi-step analysis, architecture decisions

### OpenAI GPT-4o (`openai-adapter.ts`)
- **Fit score base:** 80 (+25 for modern/react/nextjs/api/backend/fullstack)
- **Capabilities:** planning, scaffolding, code-editing, refactoring, fullstack-build
- **Use when:** Full-stack web applications, React, API design

### Gemini 1.5 Pro (`gemini-adapter.ts`)
- **Fit score base:** 90 (+20 for google/gcp/firebase/cloud/bigquery/analytics)
- **Capabilities:** planning, scaffolding, code-editing, refactoring, repo-navigation
- **Use when:** GCP-native applications, Firebase, Google Cloud integrations

### Antigravity (`antigravity-adapter.ts`)
- **Fit score base:** 50 (+25 for architecture/system/workflow/prompt tasks)
- **Capabilities:** planning, scaffolding, prompt-driven-build, repo-navigation
- **Use when:** System design, autonomous orchestration, architectural scaffolding

### Cursor (`cursor-adapter.ts`)
- **Fit score base:** 45 (+30 for refactor tasks, +20 for TypeScript/monorepo/bug-fix)
- **Capabilities:** code-editing, refactoring, repo-navigation, contextual-iteration
- **Use when:** Refactoring existing code, fixing bugs, TypeScript-heavy projects

### Windsurf (`windsurf-adapter.ts`)
- **Fit score base:** 50 (+30 for ship-mvp, +15 for generate-files, +20 for fullstack/dashboard/app)
- **Capabilities:** fullstack-build, contextual-iteration, code-editing, scaffolding
- **Use when:** Generating full-stack MVPs, dashboard applications, SaaS scaffolding

---

## Routing Interface

```typescript
export interface PlatformAdapter {
  id: string;
  name: string;
  canHandle(input: AdapterExecutionRequest): boolean;
  recommend(input: AdapterExecutionRequest): AdapterRecommendation;
}

export interface AdapterExecutionRequest {
  action: string;        // e.g. "plan", "generate-files", "refactor", "scaffold"
  taskType: string;      // e.g. "web-app", "api", "automation", "script"
  idea: string;
  mode: Mode;
}

export interface AdapterRecommendation {
  adapterId: string;
  fitScore: number;      // 0-100
  capabilities: string[];
  rationale: string;
}
```

### Routing Algorithm

```typescript
export function selectBestAdapter(input: AdapterExecutionRequest): PlatformAdapter {
  const recommendations = getAvailableAdapters()
    .filter(adapter => adapter.canHandle(input))
    .map(adapter => adapter.recommend(input))
    .sort((a, b) => b.fitScore - a.fitScore);

  const best = recommendations[0];
  return getAvailableAdapters().find(a => a.id === best?.adapterId) ?? antigravityAdapter;
}
```

---

## Definition of Done

- [ ] All 6 adapters documented in this spec with fit score logic and ideal use cases
- [ ] `packages/adapters/src/types.ts` exports `PlatformAdapter` and `AdapterExecutionRequest` with correct signatures
- [ ] Adapter selection is traceable in run audit events (which adapter was selected and why)
- [ ] `ADAPTER_ARCHITECTURE.md` references this spec for the AI routing layer
