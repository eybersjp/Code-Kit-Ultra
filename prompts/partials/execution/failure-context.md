{{#if memory.recentFailures}}
## Recent Failure Context

The following execution attempts have failed in recent history for this tenant and goal context. You must review these failures and explicitly avoid the approaches, assumptions, or tool calls that led to them. Do not repeat a previously failed approach without first providing a concrete explanation of why it will succeed this time.

{{#each memory.recentFailures}}
### Failure {{@index_1}}: Run `{{this.runId}}`

- **Timestamp**: {{this.timestamp}}
- **Phase at failure**: {{this.phaseAtFailure}}
- **Failure reason**: {{this.reason}}
- **Failed step**: {{this.failedStep}} (skill: `{{this.skill}}`)
- **Scope affected**: {{this.scope}}
- **Was rolled back**: {{#if this.rolledBack}}Yes{{else}}No — manual remediation may be required{{/if}}

{{#if this.failedApproach}}
**Failed approach summary**: {{this.failedApproach}}
{{/if}}

{{#if this.avoidanceGuidance}}
**Avoidance guidance**: {{this.avoidanceGuidance}}
{{/if}}

---
{{/each}}

**Instruction**: Before proposing any execution path, verify that it does not repeat any of the failed approaches listed above. If the goal cannot be achieved without an approach that previously failed, declare this explicitly and explain what has changed that would make the approach succeed now.
{{/if}}

{{#unless memory.recentFailures}}
_No recent failure context available for this run. Proceed without failure avoidance constraints._
{{/unless}}
