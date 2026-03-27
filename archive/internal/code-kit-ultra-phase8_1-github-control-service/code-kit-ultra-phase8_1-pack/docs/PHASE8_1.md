# Phase 8.1 — Real GitHub Execution + Control-Service API

## What changed

Phase 8.1 upgrades the MVP into an IDE-addressable execution platform by adding two concrete capabilities:

1. A real GitHub adapter that can:
   - create local commits in a repo
   - push a branch to a remote
   - create a GitHub pull request through the GitHub REST API
   - run an end-to-end `commit-and-pr` flow
2. A proper control-service API layer that exposes run and approval actions over HTTP for IDEs and operator dashboards.

## GitHub adapter

The GitHub adapter supports the following payloads:

### Commit

```json
{
  "action": "commit",
  "repoPath": "/absolute/path/to/repo",
  "branch": "feature/phase8-1",
  "message": "feat: add governed control plane",
  "addAll": true
}
```

### Push

```json
{
  "action": "push",
  "repoPath": "/absolute/path/to/repo",
  "branch": "feature/phase8-1",
  "remote": "origin"
}
```

### Create Pull Request

```json
{
  "action": "create-pr",
  "owner": "octo-org",
  "repo": "code-kit-ultra",
  "title": "Phase 8.1 governed GitHub execution",
  "head": "feature/phase8-1",
  "base": "main",
  "body": "This PR wires the real GitHub adapter.",
  "token": "ghp_..."
}
```

### Commit and PR

```json
{
  "action": "commit-and-pr",
  "repoPath": "/absolute/path/to/repo",
  "branch": "feature/phase8-1",
  "message": "feat: phase 8.1",
  "title": "Phase 8.1",
  "base": "main",
  "owner": "octo-org",
  "repo": "code-kit-ultra"
}
```

`token` is optional in the payload when `GITHUB_TOKEN` is present in the environment.

## Control-service API

Start the service:

```bash
npm run control-service
```

or

```bash
npm run ck -- serve --port 4317
```

### Endpoints

- `GET /health`
- `GET /runs`
- `GET /approvals`
- `GET /runs/:runId`
- `GET /runs/:runId/approval`
- `POST /runs/:runId/approve`
- `POST /runs/:runId/resume`
- `POST /runs/:runId/retry-step`
- `POST /runs/:runId/rollback-step`

### Example

Approve a paused run:

```bash
curl -X POST http://127.0.0.1:4317/runs/<runId>/approve
```

Retry a specific step:

```bash
curl -X POST http://127.0.0.1:4317/runs/<runId>/retry-step \
  -H "Content-Type: application/json" \
  -d '{"stepId":"p3"}'
```

## Verification

The included tests verify:

- local git commit execution on a temporary repo
- GitHub PR creation against a local HTTP test server
- control-service endpoints for listing runs, approvals, and approving a paused run
