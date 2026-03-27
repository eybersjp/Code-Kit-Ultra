# Migration Plan

## Goal
Move from API-key-first local control assumptions to InsForge-session-first multi-tenant platform behavior without breaking existing operators.

## Phase 0 - Preparation
- create packages/auth
- create shared tenant and auth types
- introduce org/workspace/project IDs into contracts
- add correlation IDs everywhere
- inventory all extension, CLI, and control-service auth paths

## Phase 1 - Dual-stack auth
- keep existing x-api-key support for backward compatibility
- add bearer session auth support in control-service
- introduce JWT verification middleware
- add /v1/session endpoint
- add auth context resolution to run creation flow

## Phase 2 - Tenantization
- create org/workspace/project schema
- require project scope for new runs
- backfill run records with tenant context
- update audit records to include org/workspace/project fields

## Phase 3 - Extension migration
- add Sign in with InsForge command
- keep apiKey settings only under legacy mode
- fetch tenant context after sign-in
- replace API-key-first requests with bearer session tokens
- preserve local start-control command only for local dev profile

## Phase 4 - Web control plane
- stand up web UI
- implement session context, runs dashboard, gate approvals, audit explorer
- make web UI the canonical operator surface

## Phase 5 - Service accounts and automation
- define service account model
- support CI/non-interactive auth
- restrict service accounts by policy scope

## Phase 6 - Deprecation
- deprecate user API keys
- remove user-facing apiKey setting from default onboarding
- keep break-glass and CI credentials documented separately

## Definition of done
- all primary user flows use InsForge sessions
- runs are tenant-scoped
- approvals are audited with actor identity
- extension and web UI share the same backend auth model
- legacy API keys are no longer the main operator path
