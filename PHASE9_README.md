# Phase 9 — Adapters

This package adds platform adapter contracts and mock implementations for Antigravity, Cursor, and Windsurf.

## Overview
Adapters allow the system to recommend or simulate handoff to external build platforms without touching the deterministic core.

## Platform Strengths
- **Antigravity**: Best for structured planning, repo scaffolding, and large prompt-driven implementation packs.
- **Cursor**: Best for targeted file edits, iterative refactors, and code-aware repo work.
- **Windsurf**: Best for full-stack build momentum, MVP generation, and context-rich implementation loops.

## How to use
```typescript
import { recommendAdapters, selectBestAdapter } from "@code-kit-ultra/adapters";

const request = {
  projectIdea: "Build a CRM for solar installers",
  preferredAction: "ship-mvp"
};

const recommendations = recommendAdapters(request);
const winner = selectBestAdapter(request);

console.log(`Recommended: ${winner.name}`);
```

## Manual verification checklist
- [ ] All 3 adapters implement the `PlatformAdapter` contract.
- [ ] `recommendAdapters()` returns a sorted list by `fitScore`.
- [ ] `executeMock()` returns a deterministic payload for handoff simulation.
