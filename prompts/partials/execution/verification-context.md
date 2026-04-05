{{#if verification.lastStatus}}
## Last Verification Status

- **Verification run ID**: `{{verification.runId}}`
- **Status**: {{verification.lastStatus}}
- **Evaluated at**: {{verification.evaluatedAt}}
- **Steps evaluated**: {{verification.stepsEvaluated}}
- **Steps passed**: {{verification.stepsPassed}}
- **Steps failed**: {{verification.stepsFailed}}

{{#if (eq verification.lastStatus "failed")}}
### Verification Failures

The following verification steps failed in the most recent verification pass. You must address each of these failures in your current output. Do not produce an implementation that repeats the same failures.

{{#each verification.failures}}
#### Failure: `{{this.stepId}}`

- **Description**: {{this.description}}
- **Command or check**: `{{this.commandOrCheck}}`
- **Expected result**: {{this.expectedResult}}
- **Actual result**: {{this.actualResult}}
- **Failure category**: {{this.failureCategory}}

{{#if this.rootCauseHint}}
**Root cause hint**: {{this.rootCauseHint}}
{{/if}}

---
{{/each}}

**Instruction**: Your output must explicitly address each of the failures listed above. For each failure, include in your `assumptions` or `task_summary` a statement of what was changed to resolve it and why the fix is expected to make the verification step pass this time.
{{/if}}

{{#if (eq verification.lastStatus "passed")}}
All verification steps passed in the most recent verification pass. You are proceeding from a verified baseline.
{{/if}}

{{#if (eq verification.lastStatus "partial")}}
### Partial Verification — Some Steps Pending

Verification completed with some steps inconclusive. Review the pending steps below and ensure your output accounts for them.

{{#each verification.pendingSteps}}
- `{{this.stepId}}`: {{this.description}} — pending reason: {{this.pendingReason}}
{{/each}}
{{/if}}

{{else}}
_No prior verification context available for this run. This is either the first attempt or verification has not yet been executed._
{{/if}}
