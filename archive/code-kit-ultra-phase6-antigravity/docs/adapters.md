# Adapters

The adapter layer is currently a mock integration surface.

## Available adapters

- Antigravity
- Cursor
- Windsurf

## What adapters do today

They can:

- declare capabilities
- rank fit for a request
- return deterministic mock handoff payloads
- simulate what a platform-specific next step would look like

## What adapters do not do yet

They do **not** currently:

- call external APIs
- authenticate with live services
- open or modify external projects directly
- execute remote jobs

## Intended roles

### Antigravity
Best aligned with:
- planning
- scaffolding
- prompt-driven file pack generation

### Cursor
Best aligned with:
- targeted file edits
- refactoring
- repository-aware iteration

### Windsurf
Best aligned with:
- full-stack MVP momentum
- build-oriented iteration
- implementation across multiple app layers

## Extension path

When you later add real integrations, keep the shared adapter contract stable and replace only the mock execution logic.
