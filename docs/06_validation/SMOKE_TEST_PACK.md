# Smoke Test Pack — Code-Kit-Ultra

**Version:** 1.2.0 → 1.3.0  
**Last Updated:** 2026-04-04  
**Owner:** Engineering Lead  
**Run Command:** `pnpm test:smoke`  
**Target Duration:** < 5 minutes

---

## 1. Purpose

Smoke tests are the first line of defence. They run in under 5 minutes and verify the system
is alive and its critical paths are functional before the full test suite executes or a
deployment proceeds.

Smoke tests are intentionally narrow. They do not test edge cases, error paths, or performance.
They answer one question: **"Is the system basically working right now?"**

If any smoke test fails, the pipeline stops immediately — no further tests run and no
deployment proceeds until the failure is resolved.

---

## 2. When to Run

| Trigger | Action |
|---|---|
| Every `git push` to any branch | Run smoke tests in CI before lint/unit/integration |
| Every pull request | Run as a required status check — blocks merge if failing |
| Before every staging deploy | Run against staging environment |
| Before every production deploy | Run against production canary post-deploy |
| After any infrastructure change | Confirm no breakage |
| After any DB migration | Run against migrated environment |

---

## 3. Environment Requirements

The smoke suite expects the following environment variables to be set:

```
BASE_URL=http://localhost:3000        # Override for staging/prod
SMOKE_CLIENT_ID=smoke-test-client
SMOKE_CLIENT_SECRET=<test secret>
DATABASE_URL=postgresql://localhost:5432/cku_smoke
REDIS_URL=redis://localhost:6379
JWT_ISSUER=https://auth.codekit.local
JWKS_URI=https://auth.codekit.local/.well-known/jwks.json
```

The smoke suite uses a dedicated test database and a throwaway Redis namespace
(`smoke:<timestamp>`) that is flushed after the run. It does not touch production data.

---

## 4. Test Categories

### 4.1 Startup Checks

Verify the server process starts correctly and all infrastructure dependencies are reachable.

| ID | Test | Expected Result | Timeout |
|---|---|---|---|
| S-001 | Server binds to `PORT` (default 3000) | TCP connection accepted | 10 s |
| S-002 | `GET /health` returns 200 | `{ "status": "ok" }` | 2 s |
| S-003 | `GET /health` includes DB status | `"db": "connected"` in body | 2 s |
| S-004 | `GET /health` includes Redis status | `"redis": "connected"` in body | 2 s |
| S-005 | `GET /ready` returns 200 | Server reports ready to serve traffic | 2 s |

**Failure behaviour:** If the server does not start or `/health` returns non-200, all
subsequent smoke tests are skipped and the pipeline is blocked.

---

### 4.2 Auth Smoke Tests

Verify the InsForge JWT (RS256/JWKS) authentication stack accepts valid credentials and
rejects invalid ones.

| ID | Test | Input | Expected Result |
|---|---|---|---|
| A-001 | Valid credentials return token | POST `/auth/token` with correct client_id + secret | 200, body contains `access_token` |
| A-002 | Invalid credentials return 401 | POST `/auth/token` with wrong secret | 401, body contains `error` |
| A-003 | Missing body returns 400 | POST `/auth/token` with empty body | 400 |
| A-004 | Token uses RS256 algorithm | Decode returned token header | `alg: "RS256"`, `typ: "JWT"` |
| A-005 | Token contains expected claims | Decode returned token payload | Contains `sub`, `org`, `iat`, `exp` |
| A-006 | No auth header returns 401 | `GET /v1/runs` with no Authorization | 401 |

---

### 4.3 Run Lifecycle Smoke

Verify the core run management endpoints function end-to-end across the 8-phase execution
pipeline.

| ID | Test | Input | Expected Result |
|---|---|---|---|
| R-001 | Create run | POST `/v1/runs` with valid idea payload | 201, body contains `run.id` |
| R-002 | Fetch run by ID | GET `/v1/runs/{id}` | 200, body contains `run.id` matching created run |
| R-003 | List runs | GET `/v1/runs` | 200, body contains runs array with length >= 1 |
| R-004 | Cancel run | POST `/v1/runs/{id}/cancel` | 200, body contains `status: "cancelled"` |
| R-005 | Fetch cancelled run | GET `/v1/runs/{id}` | 200, `status: "cancelled"` |
| R-006 | Fetch non-existent run | GET `/v1/runs/00000000-0000-0000-0000-000000000000` | 404 |

Tests R-002 through R-005 depend on the `run.id` produced by R-001.

---

### 4.4 Gate Smoke

Verify the 9-gate governance system responds correctly to basic gate operations.

| ID | Test | Input | Expected Result |
|---|---|---|---|
| G-001 | List gates for run | GET `/v1/runs/{id}/gates` | 200, body contains gates array |
| G-002 | Gate list is non-empty | Inspect gates array | At least 1 gate object present |
| G-003 | Gate object has required fields | Inspect first gate | Contains `id`, `name`, `status`, `phase` |
| G-004 | Approve gate | POST `/v1/gates/{id}/approve` with approver token | 200, `status: "approved"` |
| G-005 | Gate status updated | GET `/v1/runs/{id}/gates` | Matching gate shows `status: "approved"` |

Gate operations require a token with the `gate:approve` permission scope. The smoke suite
uses a pre-configured approver service account for this purpose.

---

### 4.5 Realtime (SSE) Smoke

Verify the Server-Sent Events stream connects and emits heartbeat events.

| ID | Test | Input | Expected Result |
|---|---|---|---|
| E-001 | Stream connects | GET `/v1/events/stream` with valid auth | HTTP 200, `Content-Type: text/event-stream` |
| E-002 | Heartbeat received within 5 s | Hold SSE connection open | At least 1 `event: heartbeat` received |
| E-003 | Stream closes cleanly | Abort connection client-side | No server-side error logged |
| E-004 | Run-scoped events arrive | Create a run while stream is open | `event: run.created` received on stream |

The SSE smoke test uses a 5-second connection window. Full realtime isolation and ordering
tests live in the integration suite.

---

### 4.6 CLI Smoke

Verify the `ck` CLI binary is installed and responds to basic commands.

| ID | Test | Command | Expected Result |
|---|---|---|---|
| C-001 | Version flag | `ck --version` | Prints version matching `package.json`, exit code 0 |
| C-002 | Help command | `ck help` | Prints command list, exit code 0 |
| C-003 | Run create help | `ck runs create --help` | Prints usage for `runs create`, exit code 0 |
| C-004 | Run list help | `ck runs list --help` | Prints usage for `runs list`, exit code 0 |

---

## 5. Execution

### 5.1 Running Locally

```bash
# Start infrastructure dependencies
docker compose up -d postgres redis

# Run DB migrations
pnpm db:migrate

# Start the server
pnpm dev &

# Run smoke tests
pnpm test:smoke

# Or against a specific base URL
BASE_URL=https://staging.codekit.internal pnpm test:smoke
```

### 5.2 CI Configuration

Smoke tests run as the first job in `.github/workflows/ci.yml`. All other jobs depend on it.

```yaml
jobs:
  smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    timeout-minutes: 5
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: cku_smoke
          POSTGRES_USER: cku
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
      - run: pnpm build
      - run: pnpm test:smoke
        env:
          BASE_URL: http://localhost:3000
          SMOKE_CLIENT_ID: ${{ secrets.SMOKE_CLIENT_ID }}
          SMOKE_CLIENT_SECRET: ${{ secrets.SMOKE_CLIENT_SECRET }}

  lint:
    needs: smoke
  unit:
    needs: smoke
  integration:
    needs: smoke
  build:
    needs: [lint, unit, integration]
```

---

## 6. Example Smoke Test Code

All smoke tests live in `tests/smoke/`. They use Vitest with the native `fetch` API.

### 6.1 Startup Checks (`tests/smoke/startup.smoke.test.ts`)

```typescript
import { describe, it, expect } from "vitest";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

describe("Startup checks", () => {
  it("S-002: GET /health returns 200", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
  });

  it("S-003: GET /health reports db connected", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    expect(body.db).toBe("connected");
  });

  it("S-004: GET /health reports redis connected", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    expect(body.redis).toBe("connected");
  });

  it("S-005: GET /ready returns 200", async () => {
    const res = await fetch(`${BASE_URL}/ready`);
    expect(res.status).toBe(200);
  });
});
```

### 6.2 Auth Smoke (`tests/smoke/auth.smoke.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { decodeProtectedHeader, decodeJwt } from "jose";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CLIENT_ID = process.env.SMOKE_CLIENT_ID ?? "smoke-test-client";
const CLIENT_SECRET = process.env.SMOKE_CLIENT_SECRET ?? "";

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  const body = await res.json();
  return body.access_token as string;
}

describe("Auth smoke tests", () => {
  it("A-001: valid credentials return access_token", async () => {
    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("access_token");
    expect(typeof body.access_token).toBe("string");
  });

  it("A-002: invalid credentials return 401", async () => {
    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: "wrong-secret" }),
    });
    expect(res.status).toBe(401);
  });

  it("A-003: missing body returns 400", async () => {
    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(400);
  });

  it("A-004: returned token uses RS256 algorithm", async () => {
    const token = await getToken();
    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe("RS256");
  });

  it("A-005: token payload contains required claims", async () => {
    const token = await getToken();
    const claims = decodeJwt(token);
    expect(claims.sub).toBeDefined();
    expect(claims.org).toBeDefined();
    expect(claims.iat).toBeDefined();
    expect(claims.exp).toBeDefined();
  });

  it("A-006: no Authorization header returns 401", async () => {
    const res = await fetch(`${BASE_URL}/v1/runs`);
    expect(res.status).toBe(401);
  });
});
```

### 6.3 Run Lifecycle (`tests/smoke/runs.smoke.test.ts`)

```typescript
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
let authToken: string;
let runId: string;

beforeAll(async () => {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SMOKE_CLIENT_ID,
      client_secret: process.env.SMOKE_CLIENT_SECRET,
    }),
  });
  const body = await res.json();
  authToken = body.access_token;
});

function authHeaders() {
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
}

describe("Run lifecycle smoke", () => {
  it("R-001: POST /v1/runs creates a run", async () => {
    const res = await fetch(`${BASE_URL}/v1/runs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ idea: "Smoke test run — auto-generated, safe to ignore" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.run).toHaveProperty("id");
    runId = body.run.id;
  });

  it("R-002: GET /v1/runs/{id} returns the run", async () => {
    const res = await fetch(`${BASE_URL}/v1/runs/${runId}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.id).toBe(runId);
    expect(body.run.status).toBeDefined();
  });

  it("R-003: GET /v1/runs includes the created run", async () => {
    const res = await fetch(`${BASE_URL}/v1/runs`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.runs)).toBe(true);
    expect(body.runs.some((r: { id: string }) => r.id === runId)).toBe(true);
  });

  it("R-004: POST /v1/runs/{id}/cancel cancels the run", async () => {
    const res = await fetch(`${BASE_URL}/v1/runs/${runId}/cancel`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
  });

  it("R-006: GET non-existent run returns 404", async () => {
    const res = await fetch(
      `${BASE_URL}/v1/runs/00000000-0000-0000-0000-000000000000`,
      { headers: authHeaders() }
    );
    expect(res.status).toBe(404);
  });
});
```

### 6.4 SSE Stream (`tests/smoke/sse.smoke.test.ts`)

```typescript
import { describe, it, expect } from "vitest";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SMOKE_CLIENT_ID,
      client_secret: process.env.SMOKE_CLIENT_SECRET,
    }),
  });
  const body = await res.json();
  return body.access_token as string;
}

describe("SSE realtime smoke", () => {
  it("E-001 / E-002: stream connects and receives heartbeat within 5s", async () => {
    const token = await getToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let heartbeatReceived = false;

    try {
      const res = await fetch(`${BASE_URL}/v1/events/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        if (chunk.includes("event: heartbeat") || chunk.includes("event: connected")) {
          heartbeatReceived = true;
          reader.cancel();
          break;
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") throw e;
    } finally {
      clearTimeout(timeout);
    }

    expect(heartbeatReceived).toBe(true);
  });
});
```

### 6.5 CLI Smoke (`tests/smoke/cli.smoke.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

describe("CLI smoke", () => {
  it("C-001: ck --version exits 0 and prints a version string", () => {
    const output = execSync("ck --version", { encoding: "utf-8" });
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  it("C-002: ck help exits 0 and lists commands", () => {
    const output = execSync("ck help", { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("run");
  });

  it("C-003: ck runs create --help exits 0", () => {
    expect(() => execSync("ck runs create --help")).not.toThrow();
  });

  it("C-004: ck runs list --help exits 0", () => {
    expect(() => execSync("ck runs list --help")).not.toThrow();
  });
});
```

---

## 7. Pass Criteria

A smoke run **passes** when:

1. Every test in every category exits with `pass`.
2. Total wall-clock time is under **5 minutes**.
3. Each individual test completes within its 10-second timeout.
4. The test runner exits with code `0`.

A smoke run **fails** when:

- Any single assertion fails.
- Any test times out (individual timeout: 10 seconds).
- The test runner itself crashes.
- Total runtime exceeds 5 minutes.

---

## 8. Failure Behaviour

When any smoke test fails in CI:

1. The failing test name, assertion message, and stack trace are printed to the job log.
2. All downstream CI jobs (`lint`, `unit`, `integration`, `build`, `deploy`) are
   **immediately cancelled**.
3. The PR or branch is marked **failing** — merge is blocked.
4. The on-call engineer is notified via the configured alert channel.
5. No deployment to any environment proceeds until smoke tests pass on a new commit.

**There are no exceptions to this policy.** A failing smoke test always blocks deployment.

---

## 9. Maintenance

| Action | Owner | Frequency |
|---|---|---|
| Review smoke test coverage after each release | Engineering Lead | Per release |
| Update `BASE_URL` targets when environments change | Infra | As needed |
| Add smoke test for each new top-level API endpoint | Feature owner | Per feature |
| Review total duration; refactor if approaching 4 minutes | Engineering | Monthly |
| Fix or quarantine flaky smoke tests | Feature owner | Within 2 business days of detection |

Flaky smoke tests undermine the gate. If a smoke test fails intermittently it must be
stabilised or removed from the smoke suite immediately and tracked as a bug.

---

## 10. Related Documents

- `docs/06_validation/PRODUCTION_READINESS.md` — full production checklist
- `docs/06_validation/GO_NO_GO_CHECKLIST.md` — release gate criteria
- `docs/06_validation/SECURITY_TESTING_PLAN.md` — security-focused test cases
- `docs/06_validation/TEST_STRATEGY.md` — overall test strategy
- `.github/workflows/ci.yml` — CI pipeline configuration
- `SECURITY_AUDIT.md` — open risk register
