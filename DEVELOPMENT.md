# Development Guide — Code Kit Ultra

Welcome to Code Kit Ultra development! This guide covers setup, testing, and contribution workflows.

---

## Prerequisites

- **Node.js**: v20+ (check with `node --version`)
- **pnpm**: v10+ (install with `npm install -g pnpm`)
- **Docker** (optional): For running PostgreSQL, Redis locally
- **Git**: For version control

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies across `packages/` and `apps/`.

### 2. Verify Setup

```bash
npm run cku /ck-doctor
```

This checks your environment and confirms everything is ready.

### 3. Run Tests

```bash
# Critical path tests (Gates 1–3: Security, Quality, Operations)
npx vitest run packages/auth/src apps/control-service/test/ apps/control-service/src/alerts/

# All tests (includes web UI, integration tests)
npx vitest run
```

---

## Development Environment

### Using Docker Compose (Recommended)

Spin up a full local stack (PostgreSQL, Redis, control-service) with:

```bash
docker compose up -d
```

Then in another terminal:

```bash
npm run cku /ck-run
```

### Manual Setup

If not using Docker:

1. **PostgreSQL 16**: Ensure `postgres:16` is running locally on port `5432`
   ```bash
   # macOS (via Homebrew)
   brew install postgresql@16
   brew services start postgresql@16
   
   # Ubuntu
   sudo apt-get install postgresql-16
   sudo systemctl start postgresql
   ```

2. **Redis 7**: Ensure `redis:7` is running locally on port `6379`
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```

3. **Environment Variables**: Copy `.env.example` to `.env` and set:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/cku"
   REDIS_URL="redis://localhost:6379"
   CKU_SERVICE_ACCOUNT_SECRET="your-secret-here"
   NODE_ENV="development"
   LOG_LEVEL="debug"
   ```

4. **Start the API**:
   ```bash
   cd apps/control-service
   pnpm dev
   ```

   The API will be available at `http://localhost:7474`.

---

## Testing

### Test Structure

Tests are organized by component and gate:

```
packages/auth/src/              # Gate 1 (Security) — Auth tests
  ├── verify-execution-token.test.ts  (22 tests)
  ├── verify-insforge-token.test.ts   (8 tests)
  └── resolve-session.test.ts          (3 tests)

apps/control-service/
  ├── src/alerts/alert-rules.test.ts  # Gate 3 (Operations) — Alerts (20 tests)
  └── test/
      ├── smoke.test.ts                # Gate 2 (Quality) — Smoke tests (16 tests)
      └── regression.test.ts           # Gate 2 (Quality) — Regression (28 tests)

packages/governance/src/        # Gate 1 (Security) — Governance
  ├── gate-manager.test.ts             (23 tests)
  ├── confidence-engine.test.ts        (9 tests)
  ├── kill-switch.test.ts              (10 tests)
  └── constraint-engine.test.ts        (15 tests)
```

### Running Tests

```bash
# Run all tests
npx vitest run

# Watch mode (re-run on file changes)
npx vitest

# Run specific test file
npx vitest run packages/auth/src/verify-execution-token.test.ts

# Run with coverage
npx vitest run --coverage

# Critical path only (Gates 1–3)
npx vitest run packages/auth/src apps/control-service/test/ apps/control-service/src/alerts/
```

### Test Categories

| Gate | Test File | Count | Focus |
|------|-----------|-------|-------|
| **1 (Security)** | `packages/auth/src/*.test.ts` | 46 | Auth, execution tokens, session management |
| **1 (Security)** | `packages/governance/src/*.test.ts` | 64 | Gate evaluation, confidence scoring, constraints |
| **2 (Quality)** | `apps/control-service/test/smoke.test.ts` | 16 | API endpoints, auth, runs, gates |
| **2 (Quality)** | `apps/control-service/test/regression.test.ts` | 28 | Backward compatibility (v1.2.0 → v1.3.0) |
| **3 (Operations)** | `apps/control-service/src/alerts/alert-rules.test.ts` | 20 | Alert rules, error tracking, evaluation |

**Total Critical Path Tests**: 110+ passing ✅

---

## File Structure

```
Code-Kit-Ultra/
├── apps/                          # Runnable applications
│   ├── control-service/           # Express API server (port 7474)
│   │   ├── src/
│   │   │   ├── handlers/          # HTTP request handlers
│   │   │   ├── middleware/        # Auth, rate limit, metrics
│   │   │   ├── routes/            # Endpoint definitions
│   │   │   ├── services/          # Business logic
│   │   │   ├── db/                # Database connection, migrations
│   │   │   ├── alerts/            # Alert rules & monitoring
│   │   │   └── lib/               # Utilities, logging
│   │   └── test/                  # Smoke & regression tests
│   ├── cli/                       # Command-line interface
│   └── web-control-plane/         # React web UI
│
├── packages/                      # Shared libraries
│   ├── auth/                      # JWT, execution tokens, sessions
│   ├── governance/                # 9 governance gates + managers
│   ├── orchestrator/              # Run state machine, step execution
│   ├── shared/                    # Common types, logger, utilities
│   ├── audit/                     # Audit logging, hash chain
│   ├── core/                      # Domain types
│   └── [15+ more packages]/
│
├── docs/
│   ├── 03_specs/                  # Implementation plans & specs
│   ├── 06_validation/             # Release gates & checklists
│   └── ARCHITECTURE.md
│
├── docker-compose.yml             # Local PostgreSQL, Redis stack
├── vitest.config.ts               # Test configuration
├── package.json                   # Workspace root
├── pnpm-workspace.yaml            # Workspace definition
├── tsconfig.json                  # TypeScript config
├── CHANGELOG.md                   # Release notes
├── README.md                      # Project overview
└── CONTRIBUTING.md                # Contribution guidelines
```

---

## Common Workflows

### Adding a New Feature

1. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Implement the feature** in the appropriate package or app.

3. **Write tests**:
   ```bash
   # Create a `.test.ts` file next to your implementation
   touch packages/my-package/src/my-feature.test.ts
   ```

4. **Run tests locally**:
   ```bash
   npx vitest
   ```

5. **Commit with a clear message**:
   ```bash
   git commit -m "feat(my-package): add my feature

   Description of what this feature does and why.
   
   Tests: 5 new tests added
   Coverage: +15 lines"
   ```

6. **Push and create a PR**:
   ```bash
   git push origin feature/my-feature
   ```

### Fixing a Bug

1. **Create a branch**:
   ```bash
   git checkout -b hotfix/my-bug
   ```

2. **Write a test that reproduces the bug** (failing test).

3. **Fix the bug** so the test passes.

4. **Run full test suite** to ensure no regressions:
   ```bash
   npx vitest run
   ```

5. **Commit**:
   ```bash
   git commit -m "fix(package-name): correct bug description

   Explains the root cause and the fix.
   
   Tests: 1 regression test added"
   ```

### Updating Documentation

Documentation lives in:
- `README.md` — Project overview
- `CHANGELOG.md` — Release notes
- `docs/` — Deep-dive guides
- Code comments — For complex logic

Update docs alongside code changes:

```bash
git commit -m "docs: update README for v1.3.0 features"
```

---

## Code Standards

### TypeScript

- Use strict mode (configured in `tsconfig.json`)
- Prefer explicit types over `any`
- Use interfaces for object contracts
- Leverage union types for state machines

Example:

```typescript
// ✅ Good
interface ExecutionContext {
  runId: string;
  actor: Actor;
  mode: 'safe' | 'turbo' | 'god';
}

// ❌ Avoid
const context: any = { ... };
```

### Testing

- Tests are colocated with source: `src/feature.ts` → `src/feature.test.ts`
- Use descriptive test names: `should validate execution token and return 401 if expired`
- Test behavior, not implementation
- Aim for >80% coverage on critical paths (Gates 1–3)

Example:

```typescript
// ✅ Good
it('should return 401 when execution token is expired', async () => {
  const expiredToken = generateExpiredToken();
  expect(() => verifyExecutionToken(expiredToken)).toThrow('Execution token expired');
});

// ❌ Avoid
it('test token', async () => {
  const result = verifyExecutionToken(token);
  expect(result).toBeDefined();
});
```

### Commits

Use the Conventional Commits format:

```
type(scope): subject

Body explaining the change and why.

Tests: X new tests
Fixes: #issue-number
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

---

## Release Process

### v1.3.0 Status

Current release status: **✅ CONDITIONAL GO**

#### Release Gates

| Gate | Status | Items | Tests |
|------|--------|-------|-------|
| **1 (Security)** | ✅ Complete | 7/7 | 46 passing |
| **2 (Quality)** | ✅ Complete | 5/5 | 72 passing |
| **3 (Operations)** | ✅ Complete | 5/5 | 20 passing |
| **4 (Product)** | 🔄 Conditional | 1/4 | — |

See `docs/06_validation/GO_NO_GO_CHECKLIST.md` for full details.

### Cutting a Release

```bash
# 1. Ensure all tests pass
npx vitest run

# 2. Update CHANGELOG.md with release notes

# 3. Commit the release
git commit -m "release: v1.3.0

All gates complete (17/21 hard items + conditional Gate 4)"

# 4. Tag the release
git tag -a v1.3.0 -m "v1.3.0 release"

# 5. Push to origin
git push origin main --tags
```

---

## Troubleshooting

### Tests Failing with DATABASE_URL Error

Set the environment variable before running tests:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/cku"
npx vitest run apps/control-service/test/
```

### Database Connection Refused

Ensure PostgreSQL is running:

```bash
# macOS
brew services list | grep postgresql

# Ubuntu
sudo systemctl status postgresql
```

### Redis Connection Refused

Ensure Redis is running:

```bash
# macOS
brew services list | grep redis

# Ubuntu
sudo systemctl status redis-server
```

### Tests Timeout

Increase the test timeout:

```bash
npx vitest run --test-timeout 10000
```

### Coverage Report Issues

Generate coverage:

```bash
npx vitest run --coverage
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Ubuntu
```

---

## Resources

- **Architecture**: `docs/ARCHITECTURE.md`
- **Release Gates**: `docs/06_validation/GO_NO_GO_CHECKLIST.md`
- **API Docs**: `docs/03_specs/API.md`
- **Contributing**: `CONTRIBUTING.md`
- **Changelog**: `CHANGELOG.md`

---

## Questions?

- Check existing issues on GitHub
- Review related tests for examples
- Ask in pull request reviews

Happy coding! 🚀
