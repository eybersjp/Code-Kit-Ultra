# Phase 9 — Adapters

This pack adds a mock adapter layer for Antigravity, Cursor, and Windsurf.

## Included files
- `packages/adapters/src/types.ts`
- `packages/adapters/src/antigravity-adapter.ts`
- `packages/adapters/src/cursor-adapter.ts`
- `packages/adapters/src/windsurf-adapter.ts`
- `packages/adapters/src/index.ts`

## What this phase adds
- a shared `PlatformAdapter` contract
- deterministic recommendation logic
- mock execution/handoff responses
- helper functions to list adapters, rank adapters, and select the best adapter

## Suggested test snippet

```ts
import { recommendAdapters, selectBestAdapter } from "./packages/adapters/src";

const request = {
  projectIdea: "Build a multi-tenant SaaS CRM dashboard for solar installers",
  preferredAction: "ship-mvp",
  mode: "balanced",
};

console.log(recommendAdapters(request));
console.log(selectBestAdapter(request).executeMock(request));
```

## Expected behavior
- Antigravity ranks highly for planning and prompt-pack work.
- Cursor ranks highly for refactors and targeted code editing.
- Windsurf ranks highly for MVP/full-stack build momentum.

## Manual verification checklist
- All three adapters export correctly.
- Recommendation ranking changes sensibly by request type.
- Mock execution responses are deterministic.
- No real API or external integration is required.
