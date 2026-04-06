# Monorepo Scripts Reference

**Project:** Code-Kit-Ultra v1.2.0
**Package manager:** pnpm workspaces
**Runtime:** Node 20, tsx, TypeScript strict

---

## 1. Philosophy

Scripts in this monorepo follow a three-layer model:

**Root (`package.json`)** — orchestration only. Root scripts coordinate across packages, run
the full test suite, trigger releases, or start the full development stack. They do not contain
package-specific logic. Naming convention: `noun:verb` for namespaced commands (`test:auth`,
`db:migrate`) and plain verbs for top-level commands (`build`, `typecheck`, `dev`).

**App-level (`apps/*/package.json`)** — app-specific concerns. Each app owns its own `dev`,
`build`, and `start` scripts. Root scripts may delegate to app scripts via `pnpm -w` or
`concurrently`.

**Package-level (`packages/*/package.json`)** — library concerns. Every package exposes a
standard set of scripts (`build`, `typecheck`, `test`) so that workspace-wide commands like
`pnpm -r build` work uniformly. Packages must not reference each other's scripts directly.

**Naming conventions:**
- Namespaced scripts use a colon separator: `test:auth`, `db:seed`, `dev:api`
- Release-related scripts are prefixed with `release:` or `version:`
- Database scripts are prefixed with `db:`
- Docker scripts are prefixed with `docker:`
- Development shortcuts use `dev` as the root or first segment

---

## 2. Current Scripts Inventory

| Script | Command | Purpose | When to use |
|---|---|---|---|
| `ck` | `tsx apps/cli/src/index.ts` | Run the CLI entry point via tsx | Local CLI development and manual testing |
| `preflight` | `pnpm run typecheck && pnpm run test:auth` | Full type check + auth test suite | Before opening a PR; run by CI on push |
| `build` | `pnpm -r build` | Build all packages and apps recursively | Before release; after pulling changes that affect build output |
| `typecheck` | `tsc --noEmit` | TypeScript compiler check across entire workspace | Daily development; always run before commit |
| `test:phase10_5` | `tsx examples/healing-test.ts` | Ad-hoc healing subsystem test | Manual validation of healing package behavior |
| `test:auth` | `vitest run packages/auth` | Run auth package test suite | Auth changes; included in `preflight` |
| `test:session` | `vitest run packages/auth/src/resolve-session.ts` | Run session resolution tests only | Targeted debugging of session logic |
| `test:rbac` | `vitest run packages/auth/src/rbac.ts` | Run RBAC tests only | Targeted debugging of permission logic |
| `db:migrate` | `echo 'Migration logic placeholder'` | Run database migrations | Before first run; after pulling schema changes |
| `db:seed` | `echo 'Seed logic placeholder'` | Seed development data | After a fresh migration; resetting local state |
| `dev:web` | `npm run dev -w apps/web-control-plane` | Start the Vite dev server for the web control plane | Frontend development |
| `version:bump` | `tsx scripts/release/bump-version.ts` | Bump version in VERSION file and package.json | Part of release flow; do not run manually |
| `release:notes` | `tsx scripts/release/generate-release-notes.ts` | Generate release notes from conventional commits | Automated; called by `release:prepare` |
| `changelog:update` | `tsx scripts/release/update-changelog.ts` | Append new entries to CHANGELOG.md | Automated; called by `release:prepare` |
| `lint:commits` | `tsx scripts/release/lint-commits.ts` | Validate commit messages against conventional commits spec | Run by `lint-commits.yml` on every PR |
| `release:prepare` | `npm run release:notes && npm run changelog:update` | Generate release notes and update changelog in sequence | Step 2 of the release workflow |
| `package:release` | `scripts/package-release.sh` | Package build artifacts for distribution | Run by `release.yml` workflow |
| `release:control-center` | `tsx scripts/release/control-center.ts` | Interactive release control panel | Run by `release-control-center.yml` |
| `release:control` | `npm run release:control-center` | Alias for release control center | Convenience alias |
| `release:control:milestone` | `MILESTONE_NAME='Phase 10 Milestone' tsx ...` | Release control center scoped to a milestone | Milestone-specific releases |
| `release:validate` | `tsx scripts/release/validate-release.ts` | Validate release artifacts and metadata | Final check before publishing |
| `cku` | `npx tsx ./codekit/apps/cli/src/index.ts` | Run the codekit variant of the CLI | Codekit-specific CLI testing |

---

## 3. Missing Scripts to Add

The following scripts are not yet present in `package.json` and should be added. Each fills
a gap in the development or CI workflow.

**Testing gaps:**
- `test:unit` — runs all package-level unit tests in one command, required for CI
- `test:integration` — runs integration tests with a dedicated config; separate from unit
  tests to allow different timeouts and setup
- `test:smoke` — fast sanity-check tests for post-deploy validation
- `test:coverage` — generates a coverage report across all packages; run before release
- `test:all` — convenience script combining unit and integration; used in local preflight
- `test:security` — runs security-focused test suite; should block release if failing

**Development gaps:**
- `dev` — single command to start all local services concurrently using `concurrently`
- `dev:api` — start the control-service API with hot reload via `tsx watch`

**Code quality gaps:**
- `lint` — ESLint across packages and apps; currently absent from CI
- `format` — Prettier formatting; must be run before commit

**Database gaps:**
- `db:reset` — drops and recreates the local database; destructive, local only

**Docker gaps:**
- `docker:build` — build the production Docker image
- `docker:run` — run the container locally with environment file

Add the following to the `"scripts"` block in the root `package.json`:

```json
{
  "test:unit": "vitest run packages/",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:smoke": "vitest run tests/smoke/",
  "test:coverage": "vitest run --coverage packages/",
  "test:all": "pnpm run test:unit && pnpm run test:integration",
  "test:security": "vitest run tests/security/",
  "dev": "concurrently \"pnpm run dev:api\" \"pnpm run dev:web\"",
  "dev:api": "tsx watch apps/control-service/src/index.ts",
  "dev:web": "npm run dev -w apps/web-control-plane",
  "lint": "eslint packages/ apps/ --ext .ts,.tsx",
  "format": "prettier --write packages/ apps/",
  "db:migrate": "tsx scripts/db/migrate.ts",
  "db:seed": "tsx scripts/db/seed.ts",
  "db:reset": "tsx scripts/db/reset.ts",
  "docker:build": "docker build -t code-kit-ultra .",
  "docker:run": "docker run -p 4000:4000 --env-file .env code-kit-ultra"
}
```

> Note: `dev:web` already exists; `db:migrate` and `db:seed` exist with placeholder commands
> and should be replaced with the real `tsx` invocations above.

---

## 4. Per-Package Scripts Standard

Every package under `packages/` must expose the following scripts in its own `package.json`.
This enables `pnpm -r` commands to work uniformly across the workspace.

```json
{
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run src/"
  }
}
```

**Packages that must conform to this standard:**

`adapters`, `agents`, `audit`, `auth`, `command-engine`, `core`, `events`, `governance`,
`healing`, `learning`, `memory`, `observability`, `orchestrator`, `policy`, `realtime`,
`security`, `shared`, `skill-engine`, `storage`, `tools`, `cku`

To audit compliance across all packages:

```bash
pnpm -r exec -- node -e \
  "const p = require('./package.json');
   ['build','typecheck','test'].forEach(s => {
     if (!p.scripts?.[s]) console.log(p.name, 'missing:', s)
   })"
```

---

## 5. pnpm Workspace Filtering

Use `--filter` to target specific packages or dependency graphs. This avoids rebuilding the
entire workspace for isolated changes.

| Command | Effect |
|---|---|
| `pnpm --filter packages/auth build` | Build only the `auth` package |
| `pnpm -r --filter './packages/*' test` | Run `test` in every package |
| `pnpm -r --filter '...packages/auth' build` | Build `auth` and all packages that depend on it |
| `pnpm -r --filter 'packages/auth...' build` | Build `auth` and all of its dependencies |
| `pnpm --filter apps/cli dev` | Start only the CLI app |
| `pnpm -r --filter './apps/*' build` | Build all apps |
| `pnpm --filter packages/auth test -- --reporter=verbose` | Run auth tests with verbose output |

**Filtering by changed files (useful in CI for affected-only runs):**

```bash
# Build only packages changed since main
pnpm -r --filter '...[origin/main]' build
```

**Running a one-off command in a package without a script:**

```bash
pnpm --filter packages/auth exec -- tsc --version
```

---

## 6. Environment Variables

The following table documents which scripts require specific environment variables. Missing
variables will cause silent failures or runtime errors.

| Script | Required Env Vars | Description |
|---|---|---|
| `dev:api` | `DATABASE_URL`, `JWT_SECRET`, `PORT` | API will not start without a valid DB connection and JWT secret |
| `dev:web` | `VITE_API_URL` | Vite dev server needs the API base URL for proxying |
| `dev` | All of `dev:api` + `dev:web` | Combines both sets |
| `test:auth` | `JWT_SECRET`, `TEST_DATABASE_URL` | Auth tests spin up isolated DB connections |
| `test:integration` | `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL` | Integration tests require full service stack |
| `test:security` | `JWT_SECRET`, `TEST_DATABASE_URL` | Security tests exercise auth and permission boundaries |
| `db:migrate` | `DATABASE_URL` | Migrations connect directly to the configured DB |
| `db:seed` | `DATABASE_URL` | Seeds require an already-migrated schema |
| `db:reset` | `DATABASE_URL` | Destructive — drops and recreates; never point at a production URL |
| `docker:run` | All vars passed via `--env-file .env` | Container reads from `.env` at runtime |
| `release:prepare` | `GITHUB_TOKEN` | Changelog generation may query GitHub API for PR metadata |
| `package:release` | `GITHUB_TOKEN`, `NPM_TOKEN` (if publishing) | Publishing requires auth tokens |

Copy `.env.example` to `.env` and populate all variables before running any local
development script.

---

## 7. Development Workflow Walkthrough

Follow these steps to go from a fresh clone to a running local environment.

**Step 1 — Clone and install**

```bash
git clone https://github.com/your-org/code-kit-ultra.git
cd code-kit-ultra
pnpm install
```

pnpm will install all workspace dependencies and link packages to each other. Do not use
`npm install` or `yarn` — the lockfile is pnpm-specific.

**Step 2 — Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in all required values. At minimum: `DATABASE_URL`, `JWT_SECRET`.
See Section 6 for the full list.

**Step 3 — Set up the database**

```bash
pnpm db:migrate
pnpm db:seed
```

This creates the schema and loads development fixtures. Run `pnpm db:reset` if you need a
clean slate.

**Step 4 — Start development servers**

```bash
pnpm dev
```

This starts the control-service API (with tsx watch for hot reload) and the Vite web dev
server concurrently. API defaults to port 4000; web defaults to port 5173.

**Step 5 — Run the test suite**

```bash
pnpm test:all        # unit + integration
pnpm test:auth       # auth package only (fast, good for TDD)
pnpm typecheck       # type errors only
```

**Step 6 — Build for production**

```bash
pnpm build
```

Verify there are no TypeScript errors before building. The build will not fail on type errors
unless `noEmit` is removed from the tsconfig.

---

## 8. Release Workflow

Follow these steps in order. Do not skip steps — the release workflows are sequential and
depend on each other's outputs.

**Step 1 — Run preflight**

```bash
pnpm preflight
```

Runs `typecheck` and `test:auth`. Both must pass cleanly. Fix any failures before proceeding.

**Step 2 — Prepare release artifacts**

```bash
pnpm release:prepare
```

Generates release notes from conventional commits since the last tag, then appends a new
entry to `CHANGELOG.md`. Review the generated output before committing.

**Step 3 — Open a PR**

Commit the updated `CHANGELOG.md` and any version bump changes. Open a pull request
targeting `main`. The PR title must follow conventional commit format (see
`CONVENTIONAL_COMMITS.md`).

**Step 4 — CI validation**

On push, `ci.yml` runs automatically: checkout → install → typecheck → auth tests → build
check. The `lint-commits.yml` and `pr-gate.yml` workflows also run on the PR. All checks
must pass before merge is allowed.

**Step 5 — Merge to main**

After approval, merge the PR. This triggers `ci.yml` on `main`. Do not trigger the release
workflow until this run is green.

**Step 6 — Trigger the release**

Go to Actions → `release.yml` → Run workflow. Provide the version number and milestone name.
The workflow runs typecheck + tests, then creates a GitHub release with the generated notes
and packaged artifacts.
