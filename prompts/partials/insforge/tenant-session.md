## Actor Identity

- **Actor ID**: `{{session.actorId}}`
- **Actor type**: {{session.actorType}}
- **Actor display name**: {{session.actorDisplayName}}
- **Trust level**: {{session.actorTrustLevel}}
- **Authentication method**: {{session.authMethod}}
- **Session ID**: `{{session.sessionId}}`
- **Session bound at**: {{session.boundAt}}
- **Session expires at**: {{session.expiresAt}}

## Tenant Scope

- **Tenant ID**: `{{tenant.tenantId}}`
- **Tenant name**: {{tenant.tenantName}}
- **Tenant tier**: {{tenant.tier}}
- **Environment**: {{tenant.environment}}
- **Region**: {{tenant.region}}

Authorized directory boundaries:
{{#each tenant.authorizedPaths}}- `{{this}}`
{{/each}}
Authorized environments:
{{#each tenant.authorizedEnvironments}}- `{{this}}`
{{/each}}
## Actor Permissions

The actor has been granted the following permissions within this tenant context:

{{#each session.permissions}}- `{{this}}`
{{/each}}
{{#unless session.permissions}}
_No permissions declared. Treat as read-only with no execution authority._
{{/unless}}

## Tenant-Level Restrictions

The following capabilities are explicitly restricted for this tenant and may not be invoked under any circumstances:

{{#each tenant.restrictions}}- `{{this}}`
{{/each}}
{{#unless tenant.restrictions}}
_No additional tenant-level restrictions declared beyond the active policy._
{{/unless}}

## Identity Rules

- **Never assume access outside tenant scope.** Even if a resource or system is technically reachable, any access outside the authorized paths and environments listed above is a policy violation.
- **Never impersonate another actor or tenant.** All operations must be performed as the declared actor identity within the declared tenant context.
- **Session binding is enforced.** All operations in this run are bound to session `{{session.sessionId}}`. Do not inherit context or permissions from any other session.
- **Permissions are explicit, not implied.** If a permission is not listed above, assume it is not granted. Do not infer permissions from role names, actor type, or prior behavior.
