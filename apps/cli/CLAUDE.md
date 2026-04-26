# CLI Application — Code Kit Ultra Command-Line Interface

## Quick Overview

The CLI application (`apps/cli/`) is the command-line interface for Code Kit Ultra, enabling operators to:
- Create and manage execution runs via the control-service API
- Approve or reject governance gates interactively
- Query run status and execution logs
- Configure projects and API endpoints

The CLI is built with **Commander.js** for command parsing and uses **Axios** for HTTP communication with the control-service. It supports multiple execution modes (turbo, builder, pro, expert, safe, balanced, god) that adjust the automation/approval ratio.

**Key Files:**
- `src/index.ts` — Main CLI entry point, command definitions, mode controller
- `src/handlers/` — Command handlers (agent-evolution, agent-profile, consensus, learning, policy-diff, vote, outcome)
- `src/lib/interactive-prompts.ts` — Interactive CLI prompts (yes/no, text input, list selection)
- `package.json` — CLI metadata, dependencies, build config
- `src/phase10-commands.ts`, `src/phase10_5-commands.ts` — Advanced command definitions

---

## Entry Point & Initialization

**File:** `src/index.ts`

The CLI initializes with:
1. **Environment Configuration** — Reads `CKU_CONTROL_SERVICE_URL` or defaults to `http://localhost:8080`
2. **Session Management** — Loads auth token from `~/.ck/session.json`
3. **Command Registration** — Registers commands via Commander.js
4. **API Client Setup** — Axios instance with Bearer token interceptor

### Session Storage

Sessions are stored at `~/.ck/session.json` with structure:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "user-123",
  "projectId": "proj-456"
}
```

The CLI automatically injects the token into every request via Axios interceptor.

### Mode System

The CLI enforces 7 execution modes that modify automation/approval balance:

| Mode | AI Control | User Control | Pipeline | Use Case |
|------|-----------|--------------|----------|----------|
| **turbo** | Full (90%) | Minimal (10%) | AUTO | Maximum speed, minimal friction |
| **builder** | High (70%) | Low (30%) | AUTO/MINIMAL | Fast iteration, basic gates |
| **pro** | Balanced (60%) | Moderate (40%) | CHECKPOINTS | Production with checkpoints |
| **expert** | Minimal (30%) | Full (70%) | MANUAL | Expert operators, full control |
| **safe** | Minimal (20%) | High (80%) | GUARDED | Risk-averse, all approvals required |
| **balanced** | Moderate (50%) | Moderate (50%) | HYBRID | Balanced automation/control |
| **god** | Maximum (100%) | Zero (0%) | AUTONOMIC | Fully autonomous (advanced users only) |

Mode is set via environment variable `CKU_MODE` or command-line flag `--mode`.

---

## Command Categories

### 1. Workflow Commands

**`/ck-init <idea>`** — Initialize a new execution run
- Parses user intent from the provided idea string
- Creates a new run in control-service
- Saves context to project memory (`packages/memory`)
- Prompts for confirmation before proceeding

**Example:**
```bash
cku /ck-init "Deploy v1.2.3 to staging"
```

**`/ck-run [--stage <stage>]`** — Execute the workflow
- Runs the full pipeline: plan → gate evaluation → execution → approval
- Uses mode settings to determine automation level
- Streams step execution in real-time
- Handles interrupts and errors gracefully

**Example:**
```bash
cku /ck-run --stage "execution"
```

**`/ck-report`** — Show execution summary
- Displays plan, selected skills, gate status
- Lists approved gates vs. blocked gates
- Shows execution timeline and metrics

### 2. Gate & Approval Commands

**`/ck-approve <gate-id> [--reason <reason>]`** — Approve a blocked gate
- Submits approval to control-service
- Records reason in audit trail
- Resumes execution if all gates approved

**Example:**
```bash
cku /ck-approve "security-review" --reason "Code reviewed by security team"
```

**`/ck-reject <gate-id> [--reason <reason>]`** — Reject a blocked gate
- Submits rejection to control-service
- Halts execution and triggers rollback/healing
- Records reason in audit trail

### 3. Query Commands

**`/ck-list-runs [--filter <filter>] [--limit <limit>]`** — List all runs
- Queries control-service for recent runs
- Filters by status: pending, running, completed, failed
- Paginates results with limit

**Example:**
```bash
cku /ck-list-runs --filter "status=completed" --limit 10
```

**`/ck-status <run-id>`** — Check run status
- Fetches detailed status for a specific run
- Shows current step, gate status, elapsed time
- Displays execution logs (last 50 lines)

### 4. Configuration Commands

**`/ck-config set <key> <value>`** — Set CLI configuration
- Updates `~/.ck/config.json` with user preferences
- Accepts keys: `api-endpoint`, `project-id`, `default-mode`

**Example:**
```bash
cku /ck-config set api-endpoint "https://api.prod.example.com"
```

**`/ck-config get [key]`** — Get CLI configuration
- Displays current config or specific key value

### 5. Advanced Commands

**`/ck-agent-profile [--id <id>]`** — Show agent profiles
- Lists available agent profiles and their capabilities
- Displays skill recommendations for current context

**`/ck-consensus-sim <decision>`** — Simulate consensus voting
- Dry-runs consensus algorithm with provided decision
- Shows voting breakdown by agent

**`/ck-learning-report [--run-id <id>]`** — Show learning metrics
- Displays outcome feedback and learning loop data
- Shows skill effectiveness scores

---

## API Client Integration

**File:** `src/index.ts` (axios instance setup)

The CLI communicates with control-service via HTTP REST API:

### Base URL Resolution

```javascript
const CONTROL_SERVICE_URL = process.env.CKU_CONTROL_SERVICE_URL 
  || process.env.CKU_API_URL 
  || "http://localhost:8080"
```

### Request Interceptor (Authentication)

All requests automatically inject Bearer token:
```javascript
api.interceptors.request.use((config) => {
  const session = getSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/runs` | POST | Create new run |
| `/api/runs/:id` | GET | Fetch run details |
| `/api/runs/:id/status` | GET | Check run status |
| `/api/gates/:id/approve` | POST | Approve gate |
| `/api/gates/:id/reject` | POST | Reject gate |
| `/api/auth/session` | POST | Create session |
| `/health` | GET | Health check |

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CKU_CONTROL_SERVICE_URL` | `http://localhost:8080` | Control-service endpoint |
| `CKU_API_URL` | (fallback) | API endpoint (deprecated, use above) |
| `CKU_MODE` | `builder` | Default execution mode |
| `CKU_PROJECT_ID` | (empty) | Default project for new runs |
| `HOME` | (system) | Home directory (for `~/.ck/`) |

### Config File Structure

`~/.ck/config.json`:
```json
{
  "apiEndpoint": "http://localhost:8080",
  "projectId": "proj-123",
  "defaultMode": "builder",
  "outputFormat": "human",
  "colorOutput": true
}
```

### Session Storage

`~/.ck/session.json`:
```json
{
  "token": "eyJhbGc...",
  "userId": "user-123",
  "projectId": "proj-456",
  "expiresAt": "2026-04-26T15:30:00Z"
}
```

---

## Testing

### Unit Tests

Test location: `apps/cli/src/**/*.test.ts`

Test categories:
1. **Command Parsing** — Test argument parsing for each command
2. **Mode Normalization** — Verify mode validation and defaults
3. **Session Management** — Test session load/save logic
4. **Interactive Prompts** — Test yes/no and list selection (mocked TTY)

### Integration Tests

Test location: `apps/cli/__tests__/integration/`

Test scenarios:
1. **End-to-end run creation** — Initialize run → execute → approve → complete
2. **API error handling** — Network errors, timeout, unauthorized
3. **Session expiry** — Token refresh, re-authentication flow
4. **Mode switching** — Verify behavior changes per mode

### Running Tests

```bash
# All CLI tests
pnpm --filter cli run test

# Watch mode
pnpm --filter cli run test:watch

# Coverage
pnpm --filter cli run test:coverage
```

---

## Deployment & Distribution

### Building the CLI

```bash
# Build TypeScript
pnpm --filter cli run build

# Output: dist/index.js (CommonJS entry point)
```

### Packaging as Binary

The CLI can be packaged as a standalone binary using **pkg** or **esbuild**:

```bash
# Create executable binary (macOS/Linux)
npm install -g pkg
pkg dist/index.js --output cku --targets node18-macos

# Or use esbuild to create a single JS bundle
esbuild dist/index.js --bundle --platform=node --outfile=cku.js
```

### Distribution Options

1. **npm Package** — Publish to npm registry (`npm install -g code-kit-ultra`)
2. **Homebrew Formula** — macOS distribution
3. **GitHub Releases** — Pre-built binaries for each OS
4. **Docker Image** — Containerized CLI (`docker pull codekit/cli`)

---

## Gotchas & Troubleshooting

### 1. API Endpoint Discovery

**Problem:** CLI can't reach control-service

**Solution:** Verify endpoint:
```bash
curl http://localhost:8080/health
```

If not responding, check:
- Is control-service running? (`docker ps | grep control-service`)
- Environment variable set? (`echo $CKU_CONTROL_SERVICE_URL`)
- Network connectivity? (`ping localhost`)

### 2. Authentication Token Management

**Problem:** "Unauthorized" or "Invalid token" errors

**Solution:**
- Check session file exists: `cat ~/.ck/session.json`
- Verify token is valid: `jwt-decode ~/.ck/session.json`
- Re-authenticate: `cku /ck-signin` or delete session and retry
- Check token expiry: Compare `expiresAt` with current time

### 3. Mode Compatibility

**Problem:** Gates not approving in "turbo" mode

**Solution:**
- Verify mode setting: `cku /ck-config get default-mode`
- Check policy.json gates for auto-approve settings
- Some gates may require manual approval even in turbo mode (security gates)

### 4. Project/Run Context

**Problem:** "No idea provided and no previous idea found" error

**Solution:**
- Initialize a run first: `cku /ck-init "your idea"`
- Or set default project: `cku /ck-config set project-id "proj-123"`
- Project memory is stored in: `~/.codekit/memory.json`

### 5. Version Compatibility

**Problem:** CLI version mismatch with control-service

**Solution:**
- Ensure CLI and control-service versions match (both >= v1.1.0)
- Check CLI version: `cku --version`
- Check API version: `curl http://localhost:8080/api/version`
- Incompatible: Control-service v0.8 won't work with CLI v1.1

---

## Common Workflows

### Create & Approve a Run

```bash
# 1. Initialize with intent
cku /ck-init "Add authentication to payment API"

# 2. Execute the workflow
cku /ck-run

# 3. Review gates (if mode is not fully automated)
cku /ck-report

# 4. Approve required gates
cku /ck-approve "security-review" --reason "Code reviewed"
cku /ck-approve "performance-gates" --reason "Load test passed"

# 5. Check final status
cku /ck-status <run-id>
```

### Query Recent Runs

```bash
# List last 10 completed runs
cku /ck-list-runs --filter "status=completed" --limit 10

# Check specific run
cku /ck-status "run-abc123"

# View execution log
cku /ck-status "run-abc123" --show-logs
```

### Switch Execution Mode

```bash
# Set default mode
cku /ck-config set default-mode "pro"

# Or use command-line flag
cku /ck-run --mode "safe"
```

---

## Cross-References

**Depends on:**
- [packages/shared](../../packages/shared/CLAUDE.md) — Type definitions (Mode, GateDecision, Task)
- [packages/orchestrator](../../packages/orchestrator/CLAUDE.md) — Run execution pipeline
- [packages/memory](../../packages/memory/CLAUDE.md) — Project memory and context
- [packages/auth](../../packages/auth/CLAUDE.md) — Token generation and validation

**Used by:**
- [control-service](../control-service/CLAUDE.md) — Receives API calls from CLI
- [web-landing](../web-landing/CLAUDE.md) — Links to CLI documentation
- [VS Code extension](../../extensions/code-kit-vscode/CLAUDE.md) — Alternative UI for same control-service

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Main documentation index
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — System design and layers
- [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) — How to deploy CLI as binary
- [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) — Common CLI issues and fixes
