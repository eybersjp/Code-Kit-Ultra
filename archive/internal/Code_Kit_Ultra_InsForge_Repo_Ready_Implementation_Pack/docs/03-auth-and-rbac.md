# Authentication and RBAC

## Design rule
Authentication is not authorization.

### Authentication source
InsForge is the root source of identity.

### Authorization source
Code Kit Ultra policy layer is the source of product-specific permissions.

## Token model

### Token A - InsForge Access Token
Used by:
- web control plane
- VS Code extension
- interactive CLI

Purpose:
- prove user identity
- carry tenant/session context

### Token B - Code Kit Ultra Execution Token
Used by:
- execution service
- internal jobs
- gate approval actions
- automation flows

Purpose:
- scoped, short-lived, action-specific trust

## Baseline tenancy roles
- owner
- admin
- operator
- reviewer
- viewer
- service_account

## Product permissions
- run:create
- run:read
- run:cancel
- gate:approve
- gate:reject
- execution:start
- execution:resume
- execution:rollback
- healing:invoke
- policy:manage
- adapter:manage
- audit:read
- artifact:read
- artifact:write
- org:manage
- workspace:manage
- project:manage

## Recommended rule examples
- viewer cannot create or approve runs
- reviewer can approve low/medium-risk gates but not destructive deployment gates
- operator can start runs but needs approval for protected adapters
- admin can manage policy overlays but destructive execution still requires gate semantics
- service_account can run automated jobs within explicit policy scopes only

## Approval semantics
High-risk actions require:
- authenticated operator
- valid gate context
- project scope
- action token signed by control-service
- audit record

## Migration note
Your current API-key flow should be retained only for:
- service accounts
- CI automation
- break-glass operations
- temporary backward compatibility
