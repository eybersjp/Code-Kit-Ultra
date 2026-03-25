# Phase 8.1 — GitHub & Control Service Implementation

## Overview
Phase 8.1 introduces real-world connectivity and granular execution control to Code Kit Ultra. This update enables the system to interact directly with GitHub for version control and Pull Request management, while providing a more robust API for manual intervention during autonomous runs.

## 🔌 GitHub Integration
The new `GithubAdapter` provides structured access to local and remote git operations.

### Supported Actions:
- **`commit`**: Handles staging, committing, and optional branch creation.
- **`push`**: Pushes the current branch to a remote (e.g., `origin`).
- **`create-pr`**: Uses the GitHub REST API to submit a Pull Request.
- **`commit-and-pr`**: A combined orchestration for streamlined submission.

### Environment Requirements:
- `GITHUB_TOKEN`: Required for PR creation and remote push operations if using HTTPS.

---

## ⚙️ Execution Engine Enhancements
The orchestrator now supports manual step-level intervention through two primary mechanisms:

### 1. Step Retry (`retryTask`)
If a task fails or produces subpar results, the operator can trigger a retry. This re-executes the specific task without losing the state of previous successful steps.

### 2. Step Rollback (`rollbackTask`)
Adpters now optionally support a `rollback` method. For the `GithubAdapter`, this allows undoing a commit or resetting the branch state if a step needs to be completely reverted.

---

## 🚀 Control Service API
The `control-service` has been expanded with new endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/runs/:runId/retry-step` | `POST` | Manually triggers a retry of the current or specified step. |
| `/runs/:runId/rollback-step` | `POST` | Manually triggers a rollback of the current or specified step. |
| `/runs/:runId/approve` | `POST` | Approves a paused run. |

---

## 🛠️ CLI Additions
- `code-kit serve`: Starts the local Control Service (default port: 3100).
- `code-kit /ck-retry-step <runId> [stepId]`: Command-line interface for step retries.
- `code-kit /ck-rollback-step <runId> [stepId]`: Command-line interface for step rollbacks.
