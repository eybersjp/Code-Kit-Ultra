# Code Kit Ultra — Phase 10 Production Pack

This pack adds a **self-improving execution layer** on top of the existing
Code Kit Ultra foundation (Phase 9.3 Intelligent Execution).

## Included
- Outcome engine
- Learning store and pattern engine
- Adaptive policy overlays
- Adapter reliability scoring
- Execution optimizer
- Feedback ingestion CLI
- Docs, launch assets, and tests

## Suggested integration order
1. Add `packages/learning`
2. Merge shared types
3. Wire `outcome-engine` into the orchestrator completion flow
4. Apply adaptive policy overlay before execution
5. Run the included tests

## Commands to add
- `npm run ck -- outcome --run <id> --rating 5 --feedback "worked well"`
- `npm run ck -- learning-report`
- `npm run ck -- agent-evolution`
- `npm run ck -- optimize-run <id>`
