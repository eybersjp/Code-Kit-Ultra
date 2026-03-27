# Code Kit Ultra — Phase 9 Pack

Code Kit Ultra Phase 9 hardens the governed execution platform for enterprise-style operation.

## Included

- governed CLI orchestration
- resumable runs in `.codekit/runs/<run-id>/`
- file-system adapter
- safe terminal adapter
- GitHub adapter for commit, push, pull request creation, and GitHub Checks
- control-service HTTP API with auth and RBAC
- policy engine with approval rules and command blocking
- tamper-evident audit log
- metrics endpoint for observability
- smoke, execution, GitHub, control-service, and enterprise tests

## Environment setup

```bash
npm install
```

Optional for real GitHub API work:

```bash
export GITHUB_TOKEN=your_token_here
export CODEKIT_ADMIN_API_KEY=your_custom_admin_key
```

## Default local API keys

- `admin-key`
- `operator-key`
- `reviewer-key`
- `viewer-key`

## CLI usage

```bash
npm run ck -- init "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing"
```

Approve a paused run:

```bash
npm run ck -- approve <runId>
```

Retry a step:

```bash
npm run ck -- retry-step <runId> p3
```

Rollback a step:

```bash
npm run ck -- rollback-step <runId> p2
```

Start the API layer:

```bash
npm run control-service
```

## Control-service endpoints

Open endpoints:
- `GET /health`

Authenticated endpoints:
- `GET /metrics`
- `GET /policy`
- `GET /runs`
- `GET /approvals`
- `GET /runs/:runId`
- `GET /runs/:runId/approval`
- `GET /runs/:runId/audit`
- `POST /runs/:runId/approve`
- `POST /runs/:runId/resume`
- `POST /runs/:runId/retry-step`
- `POST /runs/:runId/rollback-step`

Pass the API key with `x-api-key`.

## Enterprise behavior

- GitHub tasks require approval by policy, while explicit checkpoints can require approval for any adapter
- destructive shell patterns are blocked before execution
- every critical action creates an audit event with hash chaining
- rollback is restricted to admins in the control plane
- metrics summarize runs, step failures, and rollbacks

## Testing

```bash
npm run test:all
```

This covers:

- artifact creation and pause flow
- approval and completion flow
- local git commit execution
- pull request request generation against a test server
- control-service API health and approval routes
- auth, policy blocking, audit trail, and metrics
