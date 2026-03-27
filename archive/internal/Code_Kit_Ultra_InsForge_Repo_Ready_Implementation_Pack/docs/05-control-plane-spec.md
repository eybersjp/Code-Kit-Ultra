# Control Plane Specification

## Surfaces
- VS Code extension
- web control plane
- CLI

## Canonical control plane
The web control plane is the canonical UX.
The VS Code extension is the embedded operator surface.
The CLI is the power-user and automation surface.

## Shared UX primitives
- authenticated user context
- org/workspace/project selector
- run dashboard
- run detail timeline
- gate queue
- audit trail
- policy view
- adapter health
- healing actions
- artifact browser

## VS Code extension requirements
1. Sign in with InsForge
2. Cache short-lived session context
3. Resolve selected org/workspace/project
4. Display current control-service health
5. Subscribe to run timeline updates
6. Approve/reject gates
7. Open artifact/report links
8. Start local control-service only in local-dev mode

## Web control plane requirements
1. Session-first login
2. org/workspace/project switcher
3. run list with status, risk, actor, timestamps
4. timeline stream with simulation and verification details
5. gate inbox
6. policy and role admin
7. service account management
8. audit explorer
9. artifact previews

## CLI requirements
### Interactive mode
- login via InsForge device/browser flow
- persist local session
- select default org/workspace/project

### Automation mode
- service account token
- non-interactive context flags
- explicit project scoping

## Status model
Run statuses:
- draft
- queued
- simulating
- awaiting_approval
- executing
- verifying
- succeeded
- failed
- rolled_back
- cancelled

Gate statuses:
- pending
- approved
- rejected
- expired
- bypassed
