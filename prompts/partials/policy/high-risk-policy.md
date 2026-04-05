High-risk policy addendum in effect:

This run has been classified as high-risk or involves operations subject to elevated governance controls. The following additional constraints apply and supersede any conflicting guidance in the default policy.

**Mandatory human approval**: All operations rated `high` or `critical` risk require explicit human approval before execution begins. Machine identities and service accounts may not self-authorize high-risk operations.

**No autonomous production execution**: No operation that targets a production environment may be executed autonomously. A human operator must review and confirm the execution plan, acknowledge the blast radius assessment, and provide an explicit go-ahead signal before any production-scoped step is invoked.

**Blast radius assessment required**: Any plan that modifies shared infrastructure, public APIs, production databases, or multi-tenant resources must include a documented blast radius assessment. The assessment must identify: which systems are affected, how many users or tenants are impacted, whether the change is reversible, and the maximum recovery time if the change must be rolled back.

**Rollback plan mandatory**: A complete, tested rollback plan is required for every phase. Plans without a verifiable rollback path for each mutating step must not proceed past the gate-manager. "Rollback is not applicable" is not an acceptable response for any plan that modifies persistent state.

**Dual approval for destructive operations**: Any operation that permanently deletes data, removes infrastructure, revokes permissions, or terminates services requires approval from two distinct human principals. A single approver is not sufficient for destructive operations regardless of their role or trust level.

**Audit logging is non-negotiable**: All inputs, outputs, decisions, and gate results for this run must be logged to the audit trail. Do not proceed with any step that cannot be audited. If the audit system is unavailable, halt execution and escalate.

**Session binding is enforced**: All operations in this run are bound to the session declared in the identity context. Cross-session operation inheritance is not permitted under high-risk policy.
