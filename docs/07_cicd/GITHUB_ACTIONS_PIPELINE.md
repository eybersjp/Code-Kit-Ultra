# GitHub Actions Pipeline Guide

> Code-Kit-Ultra v1.2.0 — CI/CD reference for all GitHub Actions workflows.

---

## Overview

### Pipeline Strategy

Code-Kit-Ultra uses **trunk-based development** with short-lived feature branches. The pipeline enforces quality gates at every stage of the development lifecycle.

```
feature/* ──────► main ──────► release/vX.Y ──────► tag vX.Y.Z ──────► public
                    │                                       │
                 ci.yml                            version-bump-release.yml
               pr-gate.yml                          release-control-center.yml
             lint-commits.yml                           public-release.yml
```

**Branch conventions:**

| Branch pattern | Purpose |
|---|---|
| `main` | Trunk; always deployable |
| `feature/<slug>` | Short-lived feature work |
| `release/<version>` | Stabilization branch for a version |
| `hotfix/<slug>` | Emergency patch off main |
| `chore/<slug>` | Tooling, dependencies, docs |

**Key principles:**
- Every push and PR to `main`, `develop`, or `release/**` runs the full verification suite.
- PRs require branch name validation (`feature/`, `release/`, `hotfix/`, `chore/` prefixes).
- PR titles must follow conventional commit format (enforced by `lint-commits.yml`).
- Releases are always gated by the Release Control Center (RCC) governance step.
- Tags matching `v*` trigger the public release publication workflow.

---

## Current Workflow Inventory

### `ci.yml` — Core CI

**Trigger:** Push and PR to `main`, `develop`, `release/**`

**Purpose:** The primary health check for every code change. Ensures the monorepo can typecheck, tests pass, and the build does not regress.

**Steps:**
1. Checkout repository
2. Set up Node.js 20
3. Set up pnpm 10
4. Cache the pnpm store (`pnpm-lock.yaml` hash key)
5. `pnpm install --frozen-lockfile`
6. `pnpm run typecheck` — TypeScript strict-mode check across all packages
7. `pnpm run test:auth` — auth package unit tests
8. Build check via `scripts/build-public-release.sh` (if present)

**Runtime:** ~3–5 minutes on `ubuntu-latest`.

---

### `pr-gate.yml` — PR Quality Gate

**Trigger:** PR events: `opened`, `synchronize`, `reopened`

**Purpose:** Validates branch naming conventions and runs a fast typecheck gate before the full CI suite.

**Steps:**
1. **Branch name check** — regex validates `feature/`, `release/`, `hotfix/`, or `chore/` prefix; fails immediately if invalid
2. Checkout, Node 20, pnpm 10 install
3. `pnpm run typecheck`
4. Repo health summary (prints branch, Node version, TypeScript version to logs)

**Note:** This job is a required status check. PRs cannot merge if the branch name fails validation.

---

### `lint-commits.yml` — Lint Commit Messages

**Trigger:** Push to `main`; PR events: `opened`, `edited`, `synchronize`, `reopened`

**Purpose:** Enforces conventional commit format on every commit in a PR and validates the PR title.

**Steps:**
1. Checkout with full history (`fetch-depth: 0`)
2. Node 20, pnpm 10 install
3. On push: `tsx scripts/release/lint-commits.ts "<before>..<after>"`
4. On PR: `tsx scripts/release/lint-commits.ts "origin/<base>..HEAD"`
5. On PR: `tsx scripts/release/lint-pr-title.ts "<pr-title>"`

**See also:** `docs/07_cicd/CONVENTIONAL_COMMITS.md`

---

### `release.yml` — Release Milestone

**Trigger:** Manual (`workflow_dispatch`) with inputs: `version` (e.g., `v1.2.0`), `milestone_title`

**Purpose:** Runs verification gates then creates a named GitHub Release with a milestone description.

**Steps:**
1. Verification job: checkout → Node 20 → pnpm install → typecheck → `test:auth`
2. (After verify) Create GitHub Release via `actions/create-release@v1` with the tag and milestone title

**Inputs:**

| Input | Required | Default |
|---|---|---|
| `version` | Yes | `v1.2.0` |
| `milestone_title` | Yes | `Phase 10 Production Integration` |

---

### `version-bump-release.yml` — Manual Release Preparation

**Trigger:** Manual (`workflow_dispatch`) with inputs: `bump_type` (major/minor/patch or explicit version), `release_summary`

**Purpose:** Full automated release preparation — bumps version, generates release notes, updates changelog, runs governance gate, commits metadata, creates tag, and publishes a GitHub Release.

**Steps:**
1. Checkout with full history, Node 20, pnpm install
2. `pnpm run typecheck`
3. Configure git identity for the commit
4. `pnpm run version:bump -- <bump_type>`
5. `pnpm run release:notes`
6. `pnpm run changelog:update`
7. `pnpm run release:control-center` (RCC governance)
8. Parse RCC JSON manifest — exits 1 on `NO-GO`
9. `git commit` and `git push` release metadata files
10. Create and push annotated git tag
11. `gh release create` with generated release notes

---

### `release-control-center.yml` — Release Control Center

**Trigger:** Manual (`workflow_dispatch`) with inputs: `milestone_name`, `release_summary`, `verification_status`, `blockers`, `risks`

**Purpose:** Runs the governance layer (RCC) independently. Generates a release control report, uploads it as an artifact, and fails the workflow if the decision is `NO-GO`.

**Steps:**
1. Checkout, Node 20, pnpm install
2. `pnpm run typecheck`
3. `pnpm run release:control-center` (with env vars from inputs)
4. Upload `releases/control-center/` as workflow artifact
5. Print the latest report to the GitHub Actions step summary
6. Grep for `NO-GO` in the report; exit 1 if found

---

### `public-release.yml` — Public Release

**Trigger:** Push of tags matching `v*`

**Purpose:** Runs the public release build (stripped binaries, checksums) and publishes release artifacts.

**Steps:**
1. Checkout, Node 20, pnpm install
2. `pnpm run build:public-release`
3. `pnpm run checksums`

---

## Proposed Additional Workflows

### 1. `integration-tests.yml` — Integration Test Suite

Runs the full integration test suite on every merge to `main`. Requires a live test database and Redis instance, provisioned via GitHub Actions services.

```yaml
name: Integration Tests

on:
  push:
    branches:
      - main

jobs:
  integration:
    name: Run Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: cktest
          POSTGRES_PASSWORD: cktest
          POSTGRES_DB: cku_integration
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://cktest:cktest@localhost:5432/cku_integration
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run database migrations
        run: pnpm run db:migrate

      - name: Run integration tests
        run: pnpm run test:integration

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/
          retention-days: 7
```

---

### 2. `security-scan.yml` — Security Scan (Scheduled)

Runs OWASP ZAP and `npm audit` daily. Results are uploaded as artifacts and failures open GitHub Security alerts.

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 3 * * *'   # Daily at 03:00 UTC
  workflow_dispatch:        # Allow manual trigger

jobs:
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run pnpm audit
        run: pnpm audit --audit-level=moderate
        continue-on-error: true

      - name: Run security-focused tests
        run: pnpm run test:security
        env:
          INSFORGE_JWKS_URL: ${{ secrets.INSFORGE_JWKS_URL }}
          NODE_ENV: test

  owasp-zap-scan:
    name: OWASP ZAP API Scan
    runs-on: ubuntu-latest
    needs: dependency-audit

    services:
      app:
        image: node:20-alpine
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
          NODE_ENV: test
        ports:
          - 4000:4000

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:4000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: zap-security-report
          path: report_html.html
          retention-days: 30
```

---

### 3. `coverage-report.yml` — Coverage Report

Generates a Vitest coverage report and publishes it to GitHub Pages (or as a PR comment).

```yaml
name: Coverage Report

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  coverage:
    name: Generate Coverage Report
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run coverage
        run: pnpm run test:coverage
        env:
          NODE_ENV: test

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14

      - name: Publish coverage to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./coverage
          destination_dir: coverage

      - name: Comment coverage summary on PR
        if: github.event_name == 'pull_request'
        uses: davelosert/vitest-coverage-report-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          json-summary-path: coverage/coverage-summary.json
```

---

### 4. `smoke-test-staging.yml` — Smoke Test (Staging)

Runs the smoke test pack against the staging environment after a deploy. Triggered manually or by a downstream deploy workflow.

```yaml
name: Smoke Test (Staging)

on:
  workflow_dispatch:
    inputs:
      staging_url:
        description: 'Staging API base URL'
        required: true
        default: 'https://staging.code-kit-ultra.internal'
  workflow_call:
    inputs:
      staging_url:
        type: string
        required: true

jobs:
  smoke:
    name: Run Smoke Tests Against Staging
    runs-on: ubuntu-latest
    timeout-minutes: 15

    env:
      STAGING_URL: ${{ inputs.staging_url }}
      INSFORGE_JWKS_URL: ${{ secrets.INSFORGE_JWKS_URL }}
      TEST_TENANT_ID: ${{ secrets.TEST_TENANT_ID }}
      TEST_SERVICE_TOKEN: ${{ secrets.TEST_SERVICE_TOKEN }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Wait for staging to be healthy
        run: |
          for i in $(seq 1 10); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/health || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "Staging is healthy."
              exit 0
            fi
            echo "Attempt $i: staging returned $STATUS, waiting 15s..."
            sleep 15
          done
          echo "Staging did not become healthy in time."
          exit 1

      - name: Run smoke tests
        run: pnpm run test:smoke

      - name: Upload smoke test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-test-results
          path: test-results/smoke/
          retention-days: 3
```

---

## Required GitHub Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Used By | Description |
|---|---|---|
| `GITHUB_TOKEN` | All | Auto-provisioned by GitHub; write access for releases and pages |
| `DATABASE_URL` | `integration-tests.yml` | PostgreSQL connection string for integration tests |
| `REDIS_URL` | `integration-tests.yml` | Redis connection string for session/cache tests |
| `TEST_DATABASE_URL` | `security-scan.yml` | Read-only test DB for ZAP scan target |
| `TEST_REDIS_URL` | `security-scan.yml` | Redis URL for ZAP scan target app |
| `INSFORGE_JWKS_URL` | `security-scan.yml`, `smoke-test-staging.yml` | JWKS endpoint for JWT verification in tests |
| `TEST_TENANT_ID` | `smoke-test-staging.yml` | Tenant ID for smoke test auth context |
| `TEST_SERVICE_TOKEN` | `smoke-test-staging.yml` | Service account token for smoke test API calls |

> **Never commit secrets to source code.** The `security(auth)` commit type exists specifically to flag when secrets are removed from code and moved to environment configuration.

---

## Branch Protection Rules

Configure on **Settings → Branches → main**:

| Rule | Setting |
|---|---|
| Require a pull request before merging | Enabled |
| Required approvals | 1 (recommended: 2 for security changes) |
| Dismiss stale pull request approvals when new commits are pushed | Enabled |
| Require status checks to pass before merging | Enabled |
| Required status checks | `Verify Base` (ci.yml), `Verified Run` (pr-gate.yml), `Lint Commit Messages` (lint-commits.yml) |
| Require branches to be up to date before merging | Enabled |
| Do not allow bypassing the above settings | Enabled |
| Restrict who can push to matching branches | Limit to release managers for direct pushes |

---

## Cache Strategy

All workflows share a consistent pnpm store cache pattern keyed on `pnpm-lock.yaml`:

```yaml
- name: Get pnpm store directory
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

**How it works:**
- The primary cache key is an exact match on the lockfile hash. A lockfile change invalidates the cache and forces a full install.
- The restore key `${{ runner.os }}-pnpm-store-` allows partial cache hits from the most recent run with a different lockfile.
- Typical cache hit time: < 30 seconds. Cold install: 2–3 minutes.

---

## Matrix Strategy

To validate against multiple Node.js versions, extend the CI job with a matrix:

```yaml
jobs:
  verify:
    name: Verify (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: ['18', '20']
      fail-fast: false   # Run all matrix variants even if one fails

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-node${{ matrix.node-version }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-node${{ matrix.node-version }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm run typecheck

      - name: Test
        run: pnpm run test:auth
```

**Note:** Node 18 reaches end-of-life in April 2025. The matrix is provided as a cross-version validation pattern; the canonical target runtime is Node 20.
