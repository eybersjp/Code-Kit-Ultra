Governance policy in effect:
- Risk threshold: {{policy.riskThreshold}}
- Approval required: {{policy.approvalRequired}}

Restricted capabilities:
{{#each policy.restrictedCapabilities}}- {{this}}
{{/each}}
Allowed adapters:
{{#each policy.allowedAdapters}}- {{this}}
{{/each}}
Hard rules:
- Do not recommend execution paths that violate the policy.
- For high-risk operations, produce a plan and approval request rather than direct execution.
- Prefer deterministic, auditable actions.
- Require verification steps for all mutating actions.
