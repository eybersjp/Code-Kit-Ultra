# CKU Package

**Quick Reference:** Code Kit Ultra CLI framework and command definitions. Provides command-line interface to control-service, session management, and command execution.

**Workspace:** `packages/cku`

**Note:** This package contains an embedded monorepo structure under `codekit/` with its own apps and packages for advanced CLI functionality.

---

## Overview

The CKU package provides a comprehensive command-line interface for Code Kit Ultra. It bridges user commands to the control-service API and orchestrator:

- **CLI Framework** — Commander.js-based command registration and dispatch
- **Session Management** — Local session storage for authentication tokens and context
- **Command Categories** — Execution, approval, listing, configuration, and administrative commands
- **API Integration** — Axios-based HTTP client to control-service
- **Output Formatting** — Chalk-based terminal UI with colors, sections, and interactive prompts

### Architecture

```
User Input (shell)
        ↓
CLI Entry Point (packages/cku/bin/)
        ↓
Command Parser (Commander.js)
        ↓
Command Handlers (packages/cku/codekit/apps/cli/src/handlers/)
        ↓
API Client → Control Service (HTTP)
        ↓
Orchestrator / Policy Engine
        ↓
Result Output (formatted with Chalk)
```

---

## CLI Entry Points

### Main CLI Entry

**Location:** `packages/cku/bin/ck`

Provides the primary command interface. Used by both standalone CLI and IDE extensions.

```bash
# Usage
ck [command] [options]

# Examples
ck init --workspace /path/to/project
ck plan --intent "Build authentication module"
ck approve --gate security --reason "Verified by security team"
ck status
```

### Shell Integration

CLI can be used as a shell command-line tool or integrated into IDEs:

```bash
# Add to PATH
export PATH="$PATH:$(pwd)/packages/cku/bin"

# Then use from anywhere
ck status --runId abc123
```

---

## Command Categories

### Initialization & Configuration

#### `ck init`

Initialize a new project context for Code Kit Ultra.

```bash
ck init --workspace /path/to/project [--mode builder]
```

**Options:**
- `--workspace` — Project root directory (required)
- `--mode` — Execution mode: `turbo`, `builder`, `pro`, `expert`, `safe`, `balanced`, `god` (default: `builder`)

**Output:**
- Session token stored in `~/.ck/session.json`
- Project memory initialized
- Ready for subsequent commands

**Example:**
```bash
$ ck init --workspace ~/my-app --mode expert
✓ Workspace initialized: ~/my-app
✓ Mode: expert
✓ Session token saved
```

#### `ck config`

View or set configuration options.

```bash
ck config                           # View current config
ck config set apiUrl http://...    # Update config key
ck config get mode                 # Read config value
```

**Available Settings:**
- `apiUrl` — Control-service endpoint (default: `http://localhost:3100`)
- `mode` — Default execution mode
- `timeout` — Command timeout (milliseconds)
- `verbose` — Verbose output (boolean)

### Execution Commands

#### `ck plan`

Generate an execution plan for a task.

```bash
ck plan --intent "Refactor auth module" [--mode expert]
```

**Options:**
- `--intent` — Natural language description of work (required)
- `--mode` — Override execution mode
- `--context` — Additional context files or directories

**Output:**
- Task decomposition
- Skills selected
- Risk assessment
- Gates to be evaluated

**Example:**
```bash
$ ck plan --intent "Add OAuth2 integration"
Plan:
- Task 1: Research OAuth2 flows [deps: none]
- Task 2: Implement provider adapter [deps: 1]
- Task 3: Add database schema [deps: 1]

Selected Skills:
- security-review (score=0.92) — OAuth2 best practices
- database-design (score=0.88)

Gates:
- security (needs-review) | OAuth2 token storage
- quality (pass) | Code coverage
```

#### `ck execute`

Execute an action batch or previously planned task.

```bash
ck execute [--plan-id <id>] [--approve-all]
```

**Options:**
- `--plan-id` — Execute specific plan (if not, uses last plan)
- `--approve-all` — Auto-approve all gates (use cautiously)
- `--dry-run` — Preview execution without changes

**Output:**
- Execution summary
- Step-by-step progress
- Approval requests for blocked gates
- Final result with artifacts

**Example:**
```bash
$ ck execute --plan-id plan-abc123
Executing plan: plan-abc123
[1/3] Analyzing dependencies...
[2/3] Generating code...
  → auth-oauth2-adapter.ts (245 lines)
  → oauth2-types.ts (85 lines)
[3/3] Running tests...
  ✓ 24 tests passed

Gates requiring approval:
- security: Review OAuth2 token storage
```

### Approval & Decision Commands

#### `ck approve`

Approve a specific gate decision.

```bash
ck approve --gate <gate-name> [--runId <id>] [--reason "..."]
```

**Options:**
- `--gate` — Gate ID to approve (required)
- `--runId` — Run ID if not using active session
- `--reason` — Approval reason (recorded in audit log)
- `--skip-audit` — Skip audit logging (not recommended)

**Output:**
- Confirmation of approval
- Audit log entry
- Next steps in execution

**Example:**
```bash
$ ck approve --gate security --reason "OAuth2 token handling verified"
✓ Gate 'security' approved
✓ Audit logged: user-123 approved gate-456
Execution resumed...
```

#### `ck reject`

Reject a gate decision.

```bash
ck reject --gate <gate-name> [--reason "..."]
```

**Options:**
- `--gate` — Gate ID to reject (required)
- `--reason` — Rejection reason (recorded in audit log)

**Output:**
- Rejection confirmation
- Suggested fixes
- Rollback information

#### `ck consensus`

Start consensus voting on a gated decision (for multi-stakeholder approval).

```bash
ck consensus --gate <gate-name> --voters user1,user2,user3
```

**Options:**
- `--gate` — Gate ID for consensus (required)
- `--voters` — Comma-separated list of voter userIds
- `--timeout` — Voting timeout (seconds, default: 3600)
- `--threshold` — Minimum approval percentage (default: 50)

**Output:**
- Voting started notification
- Voter list
- Voting status tracking

### Listing & Status Commands

#### `ck runs`

List all runs or filter by status.

```bash
ck runs [--status pending|running|completed|failed] [--limit 10] [--user <userId>]
```

**Options:**
- `--status` — Filter by status
- `--limit` — Max results (default: 10)
- `--user` — Filter by user (requires admin)
- `--sort` — Sort by: created|updated|status (default: created, desc)

**Output:**
- Table of runs with ID, status, user, duration
- Total count

**Example:**
```bash
$ ck runs --status running --limit 5
ID             Status   User       Started    Duration
run-abc123     running  user-456   1m ago     2m 15s
run-def456     running  user-789   5m ago     8m 30s
...
```

#### `ck status`

Get status of current or specific run.

```bash
ck status [--runId <id>]
```

**Output:**
- Run metadata (ID, user, mode, start time)
- Current step execution
- Gates status (passed, blocked, pending)
- Approval requests
- Estimated time remaining

**Example:**
```bash
$ ck status
Run ID: run-abc123
Status: executing
User: user-456
Mode: expert
Started: 2m 30s ago

Current Step: [3/5] Generating API endpoints
Progress: 60%

Gates:
✓ security (approved)
⏳ quality (pending)
✗ ops (blocked) — requires deployment approval

Next: Waiting for ops gate approval (timeout: 58m)
```

#### `ck gates`

List all gates in a run with detailed information.

```bash
ck gates [--runId <id>] [--filter passed|blocked|pending]
```

**Options:**
- `--runId` — Specific run (default: active run)
- `--filter` — Filter by status
- `--verbose` — Show gate descriptions and requirements

**Output:**
- Gate list with status, evaluator, decision

### Learning & Reporting Commands

#### `ck learn`

Analyze outcomes and update learning models.

```bash
ck learn --runId <id> [--outcome success|partial|failure]
```

**Options:**
- `--runId` — Run to analyze (required)
- `--outcome` — Override auto-detected outcome
- `--feedback` — User feedback for learning

**Output:**
- Learning summary
- Updated models (cached for future runs)
- Suggestions for improvement

**Example:**
```bash
$ ck learn --runId run-abc123 --feedback "Good plan but slow execution"
Learning Summary:
- Plan quality: Good (0.82)
- Execution efficiency: Fair (0.68)
- Risk prediction accuracy: Excellent (0.94)

Suggestions:
- Use 'balanced' mode for faster iterations
- Consider pre-caching dependencies
```

#### `ck report`

Generate detailed run report.

```bash
ck report --runId <id> [--format json|markdown|pdf]
```

**Options:**
- `--runId` — Run to report (required)
- `--format` — Output format (default: markdown)
- `--output` — Save to file (default: stdout)

**Output:**
- Comprehensive run details
- Timeline of events
- Gates and approvals
- Artifacts produced
- Metrics (duration, cost, quality)

---

## Session Management

### Session File Structure

Stored in `~/.ck/session.json`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user-123",
  "email": "user@example.com",
  "roles": ["engineer", "approver"],
  "workspaceRoot": "/path/to/project",
  "mode": "builder",
  "expiresAt": "2025-04-27T12:00:00Z",
  "lastRun": "run-abc123"
}
```

### Session Lifecycle

1. **Initialization** — `ck init` creates session with API token
2. **Persistence** — Session stored locally for subsequent commands
3. **Auto-refresh** — Token refreshed automatically if near expiry
4. **Expiry** — Session invalidated after token expiration
5. **Logout** — `ck logout` clears session

---

## API Integration

### Control Service Communication

The CLI communicates with control-service via HTTP/REST API.

#### API Client Setup

```typescript
const CONTROL_SERVICE_URL = process.env.CKU_CONTROL_SERVICE_URL || 'http://localhost:3100'

const api = axios.create({ baseURL: CONTROL_SERVICE_URL })

// Auto-inject auth token from session
api.interceptors.request.use((config) => {
  const session = getSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})
```

#### Common API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/session` | POST | Create session, get token |
| `/runs` | GET | List runs |
| `/runs/:id` | GET | Get run details |
| `/runs` | POST | Create new run |
| `/gates/:id/approve` | POST | Approve gate |
| `/gates/:id/reject` | POST | Reject gate |
| `/learn` | POST | Record learning outcome |
| `/health` | GET | Health check |

#### Error Handling

CLI provides user-friendly error messages:

```typescript
// 401 Unauthorized → "Session expired. Run: ck init"
// 403 Forbidden → "Permission denied. Required roles: [approver]"
// 504 Service Unavailable → "Control service unavailable. Check CKU_CONTROL_SERVICE_URL"
```

---

## Output Formatting

### Colored Output with Chalk

The CLI uses Chalk for terminal coloring:

- **Green** — Success, completed, approved
- **Red** — Error, blocked, failed
- **Yellow** — Warning, pending, attention needed
- **Blue** — Info, approved, additional context
- **Dim (gray)** — Secondary info, explanations

### Common Output Patterns

```typescript
// Section header
console.log(chalk.yellow('\nGates:'))

// Success
console.log(chalk.green('✓ Gate approved'))

// Error
console.log(chalk.red('✗ Execution failed'))

// Table
console.table(runs)

// Status indicator with conditional color
const statusColor = status === 'pass' ? chalk.green : chalk.red
console.log(`Status: ${statusColor(status)}`)
```

---

## Configuration & Environment

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CKU_CONTROL_SERVICE_URL` | Control service endpoint | `http://localhost:3100` |
| `CKU_MODE` | Default execution mode | `builder` |
| `CKU_TIMEOUT_MS` | Command timeout | `60000` (60s) |
| `CKU_VERBOSE` | Verbose output | `false` |
| `CKU_CONFIG_DIR` | Config directory | `~/.ck` |

### Config File

Create `~/.ck/config.json` for persistent settings:

```json
{
  "apiUrl": "http://localhost:3100",
  "defaultMode": "expert",
  "timeout": 120000,
  "verbose": true,
  "enableAutoApprove": false
}
```

---

## Testing

### Unit Tests for Commands

```typescript
import { describe, it, expect } from 'vitest'
import { handlePlan, handleApprove } from '@packages/cku/handlers'

describe('Plan Command', () => {
  it('creates plan from intent', async () => {
    const result = await handlePlan({ intent: 'Add auth' }, {
      runId: 'run-123',
      userId: 'user-456',
      mode: 'builder'
    })
    
    expect(result.ok).toBe(true)
    expect(result.data.tasks).toHaveLength(result.data.tasks.length)
  })
})

describe('Approve Command', () => {
  it('approves gate with reason', async () => {
    const result = await handleApprove({ gateId: 'gate-123' }, {
      runId: 'run-123',
      userId: 'user-456'
    })
    
    expect(result.ok).toBe(true)
    expect(result.data.approved).toBe(true)
  })
})
```

### Integration Tests with Mock API

```typescript
describe('CLI Integration', () => {
  it('executes full workflow: init → plan → execute', async () => {
    // Mock control-service responses
    const server = mockServer()
    
    const session = await ck.init({ workspace: '/tmp/test' })
    const plan = await ck.plan({ intent: 'Test feature' })
    const result = await ck.execute({ planId: plan.id })
    
    expect(result.ok).toBe(true)
    server.close()
  })
})
```

---

## Error Handling

### Common Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| "No active runId" | Not initialized | Run `ck init` first |
| "Session expired" | Token TTL exceeded | Run `ck init` to refresh |
| "Permission denied" | Missing required role | Contact admin for role grant |
| "Control service unavailable" | API unreachable | Check `CKU_CONTROL_SERVICE_URL` |
| "Invalid intent" | Empty or malformed intent | Provide clear, specific intent |

### Best Practices

1. **Always initialize** — Start with `ck init` in new project
2. **Check status** — Use `ck status` to verify current state before commands
3. **Review plans** — Always review plan before `ck execute`
4. **Provide reasons** — Use `--reason` flag on approvals for audit trail
5. **Monitor execution** — Watch output for errors; don't run in background

---

## Gotchas & Known Limitations

1. **Session Token Security**
   - Token stored plaintext in `~/.ck/session.json`
   - Not suitable for shared machines or untrusted environments
   - Consider credential manager in production

2. **Long-Running Commands**
   - Default 60s timeout for commands
   - Increase with `CKU_TIMEOUT_MS` for slower operations
   - No command interruption/cancellation mechanism

3. **Approval Workflow**
   - Single-user approval by default
   - Consensus voting works but requires explicit voter setup
   - No automatic escalation if approvers offline

4. **Local State**
   - Session persisted locally only
   - Not synchronized across machines
   - Each machine maintains independent session

5. **API Dependency**
   - CLI requires control-service running
   - No offline mode or cached fallback
   - Network errors block operations

---

## Cross-References

**Depends on:**
- `@packages/shared` — Types, enums (Mode, GateDecision, Task, SelectedSkill)
- `@packages/orchestrator` — Execution, mode policies
- `packages/cku/codekit/packages/memory` — Project memory management
- External: `commander` (CLI parsing), `chalk` (colors), `axios` (HTTP)

**Used by:**
- `apps/cli` — Wrapper around CKU CLI
- `extensions/code-kit-vscode` — IDE integration using CLI commands
- Users — Direct command-line usage

**Related Documentation:**
- [Root CLAUDE.md](../../CLAUDE.md) — Project overview
- [Control Service CLAUDE.md](../../apps/control-service/CLAUDE.md) — API details
- [Architecture Guide](../../docs/ARCHITECTURE.md) — System design
- [Deployment Guide](../../docs/DEPLOYMENT.md) — CLI distribution

---

## File Structure

```
packages/cku/
├── bin/
│   ├── ck                          # Main entry point
│   └── ck-sh                       # Shell integration helper
├── codekit/                        # Embedded monorepo
│   ├── apps/
│   │   └── cli/
│   │       ├── src/
│   │       │   ├── index.ts        # CLI framework setup
│   │       │   ├── handlers/       # Command handlers
│   │       │   │   ├── execute.ts
│   │       │   │   ├── plan.ts
│   │       │   │   ├── approve.ts
│   │       │   │   └── [other handlers]
│   │       │   └── phase10-commands.ts
│   │       └── package.json
│   └── packages/
│       ├── command-engine/         # Command dispatch
│       ├── shared/                 # Types, enums
│       ├── memory/                 # Project memory
│       └── orchestrator/           # Execution orchestration
├── assets/
├── scripts/
├── package.json
└── README.md
```
