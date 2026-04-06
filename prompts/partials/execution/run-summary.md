## Run Context

- **Run ID**: `{{run.runId}}`
- **Correlation ID**: `{{run.correlationId}}`
- **Goal**: {{run.goal}}
- **Current phase**: {{run.currentPhase}}
- **Initiated at**: {{run.initiatedAt}}
- **Initiated by**: `{{run.initiatedBy}}`

{{#if run.priorSummary}}
## Prior Execution Summary

{{run.priorSummary}}
{{/if}}

{{#if run.parentRunId}}
**Parent run**: `{{run.parentRunId}}` — this is a child run spawned from a parent execution context.
{{/if}}
