# API Contracts

## API style
- REST for control operations
- event stream/realtime for live run updates
- signed action endpoints for high-risk approvals
- OpenAPI as source of truth

## Core endpoints

### Session / context
- GET /v1/session
- GET /v1/context/orgs
- GET /v1/context/workspaces
- GET /v1/context/projects

### Runs
- POST /v1/runs
- GET /v1/runs
- GET /v1/runs/{runId}
- POST /v1/runs/{runId}/cancel
- POST /v1/runs/{runId}/resume
- POST /v1/runs/{runId}/rollback

### Gates
- GET /v1/gates
- GET /v1/gates/{gateId}
- POST /v1/gates/{gateId}/approve
- POST /v1/gates/{gateId}/reject

### Audit / events
- GET /v1/runs/{runId}/events
- GET /v1/runs/{runId}/audit
- GET /v1/audit

### Artifacts
- GET /v1/runs/{runId}/artifacts
- POST /v1/runs/{runId}/artifacts/presign-upload
- GET /v1/artifacts/{artifactId}/presign-download

### Policy
- GET /v1/policies
- PUT /v1/policies/{policySetId}
- GET /v1/permissions/me

## API rules
- every mutating call requires authenticated context
- every high-risk call requires action token
- every request carries correlation-id
- every response includes request-id
- run and gate operations are scoped to org/workspace/project
