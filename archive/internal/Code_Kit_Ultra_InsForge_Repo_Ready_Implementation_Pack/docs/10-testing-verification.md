# Testing and Verification

## Test categories

### 1. Auth tests
- valid InsForge token accepted
- expired token rejected
- token without required tenant context rejected
- service account token path verified

### 2. Authorization tests
- viewer cannot create run
- operator can create run
- reviewer can approve allowed gates only
- admin cannot bypass product gate rules without explicit permission
- service account is constrained to policy scope

### 3. Migration tests
- legacy API key still works in compatibility mode
- extension bearer flow works
- CLI interactive login works
- run creation includes tenant fields
- audit records include actor + tenant context

### 4. Realtime tests
- run timeline updates broadcast correctly
- gate queue updates appear in extension and web UI
- replay works from persisted event log

### 5. Execution safety tests
- high-risk action pauses
- approval token required for resume
- rollback remains audited
- healing actions preserve actor and correlation IDs

## Suggested CI stages
1. lint + typecheck
2. unit tests
3. contract tests
4. auth integration tests
5. migration smoke tests
6. extension-to-control-service e2e tests

## Manual verification checklist
- sign in from extension
- create run with tenant context
- approve gate
- observe timeline update
- download artifact
- inspect audit trail
- run rollback path
