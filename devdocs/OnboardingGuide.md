# Onboarding Guide for New Developers

## 1. Quick Start (5 Minutes)
1. **Clone the Repo**.
2. **Run `npm install`**.
3. **Run `npm run typecheck`** to confirm the environment is consistent.
4. **Run `npm run ck -- init "Hello World"`** to see the full pipeline in action.

## 2. Repository Philosophy
We prioritize **Types over implementation**. In this monorepo, everything starts in `packages/shared/src/types.ts`.
- **Don't** use `any` casts.
- **Don't** bypass gate logic.
- **Do** use the `observability` logger for any production tracing.

## 3. Modifying the Engine
To add a new orchestration feature:
1. **Define the type** in `packages/shared`.
2. **Implement the logic** in `packages/orchestrator`.
3. **Expose the command** in `apps/cli/src/index.ts`.
4. **Add a smoke test** in `examples/smoke-test.ts`.

## 4. Understanding Global State
The system is built to be stateless between runs, except for the `project-memory.json` file.
- If you change the behavior of the `memory` package, you MUST run `npx ck validate-env` to ensure you haven't broken the JSON serialization format.

## 5. Helpful Commands
- `npm run dev`: Direct execution via `tsx`.
- `npm run preflight`: Essential before any PR merge. Includes typecheck and lint (if configured).
- `npm run demo`: Runs the reference demonstration scripts.
