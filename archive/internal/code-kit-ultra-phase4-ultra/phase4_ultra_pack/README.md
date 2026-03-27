# Code Kit Ultra — Phase 4 ULTRA: Observability & Intelligence Pack

This pack upgrades Code Kit Ultra's governed autonomy stack with a full observability layer.

## What this pack adds

- Governance decision tracing
- Execution timeline logging
- Confidence score explainability
- Markdown execution report generation
- CLI handlers for trace, timeline, and score explanation
- Example orchestrator integration points
- Smoke test for the new observability flow

## Primary outcomes

After integration, Code Kit Ultra can answer:

- Why was a batch executed or blocked?
- Which governance checks passed or failed?
- Which agents voted what, and why?
- How was the confidence score composed?
- What happened during the run, in order?

## Suggested commands after integration

```bash
npx codekit /ck-trace '{"runId":"test-123"}'
npx codekit /ck-timeline '{"runId":"test-123"}'
npx codekit /ck-score-explain '{"runId":"test-123"}'
```

## File layout

```text
apps/cli/src/handlers/
packages/observability/src/
packages/shared/src/
docs/
examples/
```

## Integration guide

Read `docs/PHASE4-INTEGRATION.md` first.
