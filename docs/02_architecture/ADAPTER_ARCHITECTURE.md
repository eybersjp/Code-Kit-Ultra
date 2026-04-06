# Adapter Architecture — Code Kit Ultra

**Status:** Authoritative
**Version:** 1.2.0
**Last reviewed:** 2026-04-03
**See also:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`, `docs/03_specs/SPEC_AI_ADAPTERS.md`

---

## Overview

Code Kit Ultra operates two distinct adapter systems that serve different purposes and must not be conflated:

| System | Purpose | Location |
|--------|---------|----------|
| **ProviderAdapters** | Execute actions in the operator's environment (files, terminal, GitHub) | `packages/adapters/src/providers/` |
| **AI Routing Adapters** | Route AI generation tasks to appropriate LLM providers | `packages/adapters/src/` |

Both systems share a common design philosophy: **the orchestrator never calls a provider or AI model directly.** All execution and generation is mediated through adapters with a standardised contract.

---

## Part 1 — ProviderAdapters (Execution Adapters)

### Responsibility

ProviderAdapters are the execution boundary between the orchestration layer and the real world. They implement a four-phase contract:

```
simulate(action) → SimulationResult       // Risk assessment, no side effects
execute(action)  → ExecutionResult        // Real-world change
verify(action)   → VerificationResult     // Confirm outcome
rollback(action) → void                   // Reverse the change
```

### Core Interface

```typescript
interface ProviderAdapter {
  name: string;
  canHandle(action: Action): boolean;

  simulate(action: Action, context: ExecutionContext): Promise<SimulationResult>;
  execute(action: Action, context: ExecutionContext): Promise<ExecutionResult>;
  verify(action: Action, context: ExecutionContext): Promise<VerificationResult>;
  rollback(action: Action, context: ExecutionContext): Promise<void>;
}

interface Action {
  type: ActionType;
  payload: Record<string, unknown>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

type ActionType =
  | 'file.create' | 'file.edit' | 'file.delete' | 'file.move'
  | 'command.run'
  | 'github.commit' | 'github.pr' | 'github.check';

interface ExecutionContext {
  runId: string;
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  actorId: string;
  executionToken: string;           // Short-lived scoped token
  mode: Mode;
  dryRun: boolean;
}
```

### Simulation and Risk Assessment

Simulation is mandatory before execution. It produces a risk rating and human-readable explanation:

```typescript
interface SimulationResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  willPause: boolean;               // Based on mode policy
  requiresApproval: boolean;
  estimatedChanges: string[];       // What will change
}
```

Risk is determined by action type and payload characteristics:

| Action | Base Risk | Escalators |
|--------|-----------|-----------|
| `file.create` | low | Executable content → medium |
| `file.edit` | low | Security-sensitive paths → medium |
| `file.delete` | high | Non-empty directory, config files → critical |
| `command.run` | medium | Not in allowlist → critical; destructive flags → high |
| `github.commit` | low | Force-push, main branch → high |
| `github.pr` | low | — |

### FileSystemAdapter

Handles all local file operations. Uses Node.js `fs` module with optional sandbox enforcement.

**Simulate:** Checks path policy, estimates change set, assigns risk by path sensitivity (e.g., `*.env`, `/etc/`, `~/.ssh/` escalate to high/critical).

**Execute:** Writes, reads, copies, moves, or deletes files. Before destructive operations, writes a snapshot to `.ck/snapshots/<actionId>/` for rollback.

**Verify:** Checks file existence, content hash (SHA256), and permissions match expected state.

**Rollback:** Restores from `.ck/snapshots/<actionId>/`. Reverse-chronological; most recent snapshot first.

```typescript
// packages/adapters/src/providers/file-system-adapter.ts
export class FileSystemAdapter implements ProviderAdapter {
  name = 'filesystem';

  canHandle(action: Action): boolean {
    return action.type.startsWith('file.');
  }

  async simulate(action: Action, ctx: ExecutionContext): Promise<SimulationResult> {
    const risk = this.assessRisk(action);
    return {
      riskLevel: risk.level,
      explanation: risk.reason,
      willPause: this.modeWillPause(ctx.mode, risk.level),
      requiresApproval: risk.level === 'high' || risk.level === 'critical',
      estimatedChanges: [action.payload.path as string],
    };
  }
  // ...
}
```

### TerminalAdapter

Handles shell command execution. Enforces an allowlist and a configurable timeout.

**Command allowlist** (`config/policy.json`): Only approved commands may execute. Non-allowlisted commands receive `riskLevel: 'critical'` from simulation, which pauses all modes except `god`.

**Sandbox**: Commands run with restricted environment variables. The execution token is never passed to subprocess environment.

**Timeout**: Configurable per-command, default 30 seconds. Long-running commands (e.g., `npm install`) may extend to 120 seconds.

```typescript
// packages/adapters/src/providers/terminal-adapter.ts
export class TerminalAdapter implements ProviderAdapter {
  name = 'terminal';
  private readonly allowlist: string[];
  private readonly timeoutMs: number;

  canHandle(action: Action): boolean {
    return action.type === 'command.run';
  }

  async simulate(action: Action, ctx: ExecutionContext): Promise<SimulationResult> {
    const cmd = action.payload.command as string;
    const isAllowed = this.allowlist.some(pattern => cmd.startsWith(pattern));
    return {
      riskLevel: isAllowed ? 'medium' : 'critical',
      explanation: isAllowed
        ? `Command '${cmd}' is in the allowed list`
        : `Command '${cmd}' is NOT in the allowed list — will block in non-god modes`,
      willPause: !isAllowed || ctx.mode !== 'god',
      requiresApproval: !isAllowed,
      estimatedChanges: [`Execute: ${cmd}`],
    };
  }
  // ...
}
```

### GitHubAdapter

Handles GitHub operations via Octokit. Requires a GitHub token scoped to the target repository.

**Supported operations:**
- `github.commit` — Create or update files in a branch
- `github.pr` — Open pull requests
- `github.check` — Read CI check statuses

**Token source:** The execution token issued by `packages/auth/src/issue-execution-token.ts` includes a `githubToken` claim scoped to the target repository. The adapter extracts this claim rather than reading from environment variables directly.

```typescript
// packages/adapters/src/providers/github-adapter.ts
export class GitHubAdapter implements ProviderAdapter {
  name = 'github';

  canHandle(action: Action): boolean {
    return action.type.startsWith('github.');
  }
  // ...
}
```

### Adapter Selection

The execution engine selects the appropriate adapter using `canHandle()`:

```typescript
// packages/orchestrator/src/execution-engine.ts
function selectAdapter(action: Action, adapters: ProviderAdapter[]): ProviderAdapter {
  const adapter = adapters.find(a => a.canHandle(action));
  if (!adapter) throw new Error(`No adapter registered for action type: ${action.type}`);
  return adapter;
}
```

---

## Part 2 — AI Routing Adapters

### Responsibility

AI adapters select the best LLM provider for a given generation task (planning, coding, scaffolding, analysis) and call it with a normalised prompt interface.

### PlatformAdapter Interface

```typescript
interface PlatformAdapter {
  name: string;
  capabilities: Capability[];
  fitScore(task: GenerationTask): number;    // 0–100

  generatePlan(prompt: string, context: PlanContext): Promise<PlanResult>;
  generateCode(prompt: string, context: CodeContext): Promise<CodeResult>;
  generateScaffold(prompt: string, context: ScaffoldContext): Promise<ScaffoldResult>;
}

type Capability = 'planning' | 'coding' | 'scaffolding' | 'analysis' | 'review';

interface GenerationTask {
  type: 'plan' | 'code' | 'scaffold' | 'analysis';
  complexity: 'low' | 'medium' | 'high';
  latencyRequirement: 'fast' | 'standard' | 'quality';
  domain?: string;
}
```

### Fit Score Algorithm

The routing engine selects the highest-scoring adapter for each task:

```typescript
function selectAdapter(task: GenerationTask, adapters: PlatformAdapter[]): PlatformAdapter {
  return adapters
    .map(a => ({ adapter: a, score: a.fitScore(task) }))
    .sort((a, b) => b.score - a.score)[0].adapter;
}
```

Fit scores weight: capability match (40%) + latency match (30%) + complexity match (30%).

### Registered AI Adapters

| Adapter | Provider | Strengths | Config Key |
|---------|---------|-----------|-----------|
| `ClaudeAdapter` | Anthropic Claude | Planning, analysis, long context | `AI_ADAPTER_CLAUDE` |
| `OpenAIAdapter` | OpenAI GPT-4 | Coding, general reasoning | `AI_ADAPTER_OPENAI` |
| `GeminiAdapter` | Google Gemini | Multimodal, large context | `AI_ADAPTER_GEMINI` |
| `AntigravityAdapter` | Antigravity | Specialised scaffolding | `AI_ADAPTER_ANTIGRAVITY` |
| `CursorAdapter` | Cursor AI | IDE-aware code generation | `AI_ADAPTER_CURSOR` |
| `WindsurfAdapter` | Codeium Windsurf | In-editor completion, diff | `AI_ADAPTER_WINDSURF` |

See `docs/03_specs/SPEC_AI_ADAPTERS.md` for full per-adapter specification.

### Routing Policy

The routing policy (`config/routing-policy.json`) defines:
- Default adapter per task type
- Fallback chain when primary adapter is unavailable
- Cost and latency overrides per mode

```json
{
  "defaults": {
    "plan": "claude",
    "code": "openai",
    "scaffold": "cursor",
    "analysis": "claude"
  },
  "fallbackChain": ["claude", "openai", "gemini"],
  "modeOverrides": {
    "turbo": { "latencyRequirement": "fast" },
    "god": { "latencyRequirement": "standard" }
  }
}
```

---

## Execution Token Flow

Both adapter systems receive short-lived execution tokens — not the user's long-lived session token. This limits blast radius if a token is compromised during adapter execution.

```
Control Service
  └── createRun handler
        └── issueExecutionToken({ runId, orgId, projectId, scope: ['run:execute'] })
              → JWT (10 min, RS256, iss: 'cku-control')
              → Passed to orchestrator → execution engine → adapter context
```

Adapters validate the execution token before performing privileged operations. The token is never logged or stored beyond the request lifecycle.

---

## Boundary Rules

1. **ProviderAdapters never call AI models.** They execute deterministic actions only.
2. **AI adapters never touch the filesystem or terminal.** They produce text artifacts only.
3. **Both adapter types receive execution tokens, not session tokens.**
4. **Adapter selection is the orchestrator's responsibility.** Adapters are passive; they never self-select.
5. **Simulation is always called before execution** — even in `god` mode, where the result is logged but may not pause.
6. **Rollback is scoped to the current run.** Cross-run rollback is not supported.
