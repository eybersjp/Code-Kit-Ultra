# Code Kit Ultra — Phase 8.1 Pack

Code Kit Ultra Phase 8.1 upgrades the governed MVP with real GitHub execution and a control-service API that an IDE or operator dashboard can call directly.

## Included

- governed CLI orchestration
- resumable runs in `.codekit/runs/<run-id>/`
- file-system adapter
- safe terminal adapter
- real GitHub adapter for commit, push, and pull request creation
- control-service HTTP API for runs and approvals
- retry and rollback actions
- smoke, execution, GitHub, and control-service tests

## Environment setup

```bash
npm install
```

Optional for real PR creation:

```bash
export GITHUB_TOKEN=your_token_here
```

## CLI usage

Create a run:

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

- `GET /health`
- `GET /runs`
- `GET /approvals`
- `GET /runs/:runId`
- `GET /runs/:runId/approval`
- `POST /runs/:runId/approve`
- `POST /runs/:runId/resume`
- `POST /runs/:runId/retry-step`
- `POST /runs/:runId/rollback-step`

## GitHub adapter notes

The GitHub adapter performs real work when invoked with valid payloads:

- local `git checkout -B <branch>`
- `git add`
- `git commit -m`
- `git push -u <remote> <branch>`
- `POST /repos/{owner}/{repo}/pulls`

The adapter expects:

- a valid local repository path for commit/push actions
- a reachable GitHub API endpoint for PR creation
- `GITHUB_TOKEN` or a `token` field for PR creation

## Testing

Run all included verification:

```bash
npm run test:all
```

This covers:

- artifact creation and pause flow
- approval and completion flow
- local git commit execution
- pull request request generation against a test server
- control-service API health and approval routes

## Important verification note

Inside this packaging environment, the local git commit flow and the control-service API were verifiable. Real push-to-GitHub and real PR creation against GitHub itself depend on your repo remote and credentials at runtime.
