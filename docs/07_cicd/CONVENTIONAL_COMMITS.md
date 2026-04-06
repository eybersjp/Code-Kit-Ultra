# Conventional Commits Specification

**Project:** Code-Kit-Ultra v1.2.0
**Enforced by:** `lint:commits` script (`tsx scripts/release/lint-commits.ts`)
**Workflow:** `lint-commits.yml` runs on every PR

---

## 1. Format Specification

Every commit message must follow this structure:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- The first line (header) is mandatory. Body and footers are optional.
- A blank line separates the header from the body, and the body from footers.
- The header must not exceed 72 characters.

---

## 2. Commit Types

| Type | Semver Impact | Description | Example |
|---|---|---|---|
| `feat` | MINOR | New feature added to the public API or user-facing behavior | `feat(auth): add Redis session revocation` |
| `fix` | PATCH | Bug fix that corrects incorrect behavior | `fix(orchestrator): handle null steps in phase-engine` |
| `security` | PATCH | Security fix or vulnerability remediation | `security(auth): remove hardcoded SA secret` |
| `docs` | none | Documentation only changes | `docs(orchestrator): add SPEC_ORCHESTRATOR.md` |
| `chore` | none | Maintenance work that does not affect runtime behavior | `chore(deps): update vitest to 1.5.0` |
| `test` | none | Adding or updating tests with no production code change | `test(auth): add cross-tenant isolation tests` |
| `refactor` | none | Code restructure with no behavior change | `refactor(governance): extract gate-controller from gate-manager` |
| `perf` | PATCH | Performance improvement | `perf(db): add index on runs.org_id` |
| `ci` | none | Changes to CI/CD workflows or scripts | `ci: add integration test workflow` |
| `build` | none | Changes to the build system or tooling configuration | `build: add vitest.integration.config.ts` |
| `revert` | varies | Reverts a previous commit | `revert: feat(auth): add session revocation` |
| `BREAKING CHANGE` | MAJOR | Breaking API change — use in footer, not as type | See Section 7 |

---

## 3. Allowed Scopes

Scopes are organized by layer. Use exactly one scope per commit. Multi-scope commits must be
split into separate commits.

**Packages:**
`auth`, `orchestrator`, `governance`, `adapters`, `healing`, `learning`, `observability`,
`audit`, `events`, `realtime`, `storage`, `shared`, `policy`, `memory`, `security`,
`agents`, `skill-engine`, `command-engine`, `core`, `tools`

**Apps:**
`cli`, `api`, `web`

**Infrastructure:**
`db`, `ci`, `deps`, `docker`, `k8s`

**Docs:**
`docs`, `specs`, `changelog`

---

## 4. Subject Rules

- Use imperative mood: "add" not "added" or "adds"
- No capital first letter after the colon
- No period at the end
- Maximum 72 characters for the full header (`type(scope): subject`)
- Describe WHAT was done, not WHY — the why belongs in the body

| Correct | Incorrect |
|---|---|
| `feat(auth): add session refresh endpoint` | `feat(auth): Added session refresh endpoint` |
| `fix(orchestrator): handle empty step array` | `fix(orchestrator): fixed the bug` |
| `docs(specs): add SPEC_GOVERNANCE.md` | `docs(specs): Add SPEC_GOVERNANCE.md.` |

---

## 5. Body Rules

- Separate the body from the subject with a blank line
- Wrap lines at 72 characters
- Explain WHY the change was made and WHAT the impact is, not HOW it was implemented
- Reference related behavior, prior decisions, or spec links when useful

Example body:

```
Previously the orchestrator would silently skip phases when the step
array was null rather than throwing. This masked misconfigurations
upstream and made debugging harder. Now a MissingStepsError is thrown
at bundle validation time with the phase name and bundle ID in context.
```

---

## 6. Footer Rules

**Breaking changes** — must appear in the footer for MAJOR version bumps:

```
BREAKING CHANGE: executeRunBundle now requires actorId as second parameter.
Update all call sites to pass a valid actorId string.
```

**Issue references** — link to GitHub issues:

```
Fixes #123
Closes #456
Related to #789
```

**Co-authorship:**

```
Co-authored-by: Jane Smith <jane@example.com>
```

Multiple footers are allowed; each must appear on its own line.

---

## 7. Breaking Changes — Full Example

```
feat(orchestrator): require actorId in executeRunBundle

Previously actor was optional and defaulted to "system". This was a
security gap — all executions must be attributed to a known actor so
that audit events and RBAC checks are meaningful.

Callers that omit actorId will receive a compile-time error after this
change. The "system" actor is still valid as an explicit value for
internal automation.

BREAKING CHANGE: executeRunBundle(bundle, actor) — the actor parameter
is now required. Update all call sites to pass a valid actorId string.
Passing "system" explicitly is acceptable for automated tasks.

Closes #341
```

---

## 8. Example Commits

The following 30+ examples cover realistic changes across this codebase. Use them as
reference when writing commit messages.

```
feat(auth): add Redis-backed session revocation

feat(orchestrator): implement phase retry with backoff

feat(governance): add gate approval webhook notifications

feat(skill-engine): support async skill execution via job queue

feat(cli): add `ck run status` subcommand

feat(adapters): add Slack adapter for notification delivery

feat(healing): add automatic rollback on consecutive phase failures

fix(orchestrator): handle null steps array in phase-engine

fix(auth): resolve infinite loop in session refresh under high load

fix(governance): gate approval incorrectly blocked by expired policy

fix(adapters): Slack webhook URL not validated before dispatch

fix(realtime): WebSocket connection leak on client disconnect

fix(cli): `ck run list` crashes when no runs exist

security(auth): remove hardcoded service account secret from config

security(policy): restrict policy evaluation to org-scoped rules only

security(audit): ensure all run create/cancel events emit orgId

docs(orchestrator): add SPEC_ORCHESTRATOR.md phase lifecycle section

docs(governance): document gate approval and rejection flow

docs(auth): clarify session resolution and RBAC check order

chore(deps): update vitest from 1.3.0 to 1.5.0

chore(deps): replace deprecated @types/node with current version

chore(shared): remove unused utility functions from string-utils

test(auth): add cross-tenant session isolation tests

test(orchestrator): cover phase-engine null step edge cases

test(governance): add gate approval rejection integration test

test(rbac): verify workspace-scoped permission inheritance

refactor(governance): extract gate-controller from gate-manager module

refactor(orchestrator): split phase-engine into scheduler and executor

perf(db): add composite index on runs (org_id, status, created_at)

perf(observability): batch metric writes to reduce DB round-trips

ci: add integration test job to ci.yml workflow

ci: cache pnpm store in GitHub Actions to reduce install time

build: add vitest.integration.config.ts with 30s timeout

build: configure path aliases in tsconfig for packages/shared

revert: feat(auth): add session refresh endpoint
```

**Multi-line commit with body and footer:**

```
fix(healing): prevent double-rollback when recovery phase also fails

When a run phase failed and triggered the healing rollback, if the
rollback phase itself encountered an error the healing subsystem would
attempt a second rollback, causing duplicate audit events and
inconsistent run state in the database.

Added a guard in HealingCoordinator.attemptRecovery() that checks
run.recoveryAttempted before invoking the rollback path. The state is
set atomically before the rollback begins.

Fixes #298
Co-authored-by: Alex Chen <alex@example.com>
```

**Revert with context:**

```
revert: feat(adapters): add async Slack adapter

Reverting due to unresolved rate-limit errors under load. Will
reintroduce after the queue-based dispatch layer is in place.

This reverts commit a3f9c12.
```

---

## 9. Anti-Patterns to Avoid

These commit messages will be rejected by the `lint:commits` script or blocked in code review:

| Bad message | Problem |
|---|---|
| `fix: fixed stuff` | Too vague; subject does not describe what was fixed |
| `feat: Add Redis session revocation` | Capital letter after colon |
| `WIP: auth changes` | Not a valid conventional commit type |
| `feat(auth,orchestrator): big refactor` | Multiple scopes not allowed; split into two commits |
| `feat(auth): add Redis-backed session revocation and also fix the connection pool leak and update tests` | Subject exceeds 72 characters; covers multiple concerns |
| `update auth` | No type, no scope, no imperative subject |
| `feat(AUTH): add session revocation` | Scope must be lowercase |
| `fix(auth): Fix session resolution.` | Capital first letter and trailing period |
| `feat: ` | Empty subject |

---

## 10. Linting Integration

The `lint:commits` script (`tsx scripts/release/lint-commits.ts`) enforces this convention
automatically on CI.

**How it works:**
1. The `lint-commits.yml` workflow triggers on every pull request
2. It runs `pnpm lint:commits` against all commits on the PR branch
3. Any commit that violates the format causes the workflow to fail
4. A failing lint-commits check blocks the PR from being merged

**Running locally:**

```bash
pnpm lint:commits
```

This validates commits on the current branch. Run it before pushing to catch issues early.

---

## 11. Changelog Generation

`pnpm release:prepare` calls `npm run changelog:update`, which reads all conventional commits
since the last release tag and generates structured `CHANGELOG.md` entries.

Entries are grouped by type in this order:

1. `feat` — New Features
2. `fix` — Bug Fixes
3. `security` — Security Fixes
4. `perf` — Performance Improvements
5. `refactor` — Refactoring
6. `docs` — Documentation
7. `chore`, `ci`, `build`, `test` — Maintenance

Commits with `BREAKING CHANGE` in the footer appear in a dedicated section at the top of
the release entry.

Commits with type `chore`, `ci`, `build`, or `test` are excluded from the public-facing
release notes but are included in the internal `CHANGELOG.md`.

---

## 12. PR Title Convention

PR titles must follow conventional commit format because the PR title becomes the
squash-merge commit message when PRs are merged to `main`.

**Required format:**

```
type(scope): subject
```

**Examples:**

```
feat(auth): add Redis-backed session revocation
fix(orchestrator): handle null step array in phase-engine
chore(deps): update vitest to 1.5.0
```

The `pr-gate.yml` workflow validates the PR title against the conventional commit regex on
every PR open and edit. A malformed PR title blocks the merge.

If the PR covers multiple scopes, choose the primary scope and reference the others in the
PR description body.
