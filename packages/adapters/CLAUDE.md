# Adapters Package

**Quick Reference:** Pluggable adapter system for platform integration and code execution. Supports multiple AI providers (Claude, OpenAI, Gemini, Cursor, Windsurf, AntiGravity) and execution providers (GitHub, file-system, terminal).

**Workspace:** `packages/adapters`

---

## Overview

The adapters package provides a flexible, extensible system for integrating with multiple platforms and execution providers. It decouples the core system from specific implementations, enabling:

- **Platform Adapters** — AI providers (Claude, OpenAI, etc.) with capability-based selection
- **Provider Adapters** — Execution backends (GitHub, file-system, terminal) with risk simulation and verification
- **Recommendation Engine** — Automatic adapter selection based on execution context
- **Lifecycle Management** — Validation, simulation, execution, verification, and rollback

---

## Architecture

### Two-Tier Adapter System

```
┌─────────────────────────────────────┐
│   Platform Adapters                 │
│  (AI Providers)                     │
├─────────────────────────────────────┤
│ • Claude Adapter                    │
│ • OpenAI Adapter                    │
│ • Gemini Adapter                    │
│ • Cursor Adapter                    │
│ • Windsurf Adapter                  │
│ • AntiGravity Adapter               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Provider Adapters                 │
│  (Execution Backends)               │
├─────────────────────────────────────┤
│ • GitHub Adapter                    │
│ • File-System Adapter               │
│ • Terminal Adapter                  │
└─────────────────────────────────────┘
```

---

## Platform Adapters

Platform adapters wrap AI provider APIs with a consistent interface. Each adapter:

1. **Declares capabilities** — What the provider can do
2. **Evaluates fit** — Can it handle a given request?
3. **Provides recommendations** — Fit score and reasoning
4. **Executes (mocked)** — Simulates execution for testing

### PlatformAdapter Interface

```typescript
interface PlatformAdapter {
  id: string                                           // Unique ID
  name: string                                         // Display name
  capabilities: AdapterCapability[]                    // [planning, scaffolding, code-editing, ...]
  canHandle(input: AdapterExecutionRequest): boolean   // Quick capability check
  recommend(input: AdapterExecutionRequest): AdapterRecommendation  // Detailed recommendation
  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult  // Simulated execution
}
```

### Built-in Platform Adapters

| Adapter | ID | Capabilities | Fit Score Factors |
|---------|----|----|---|
| **Claude** | `claude` | planning, code-editing, refactoring, fullstack-build | Strong on planning and refactoring; prefers complex reasoning |
| **OpenAI (GPT-4)** | `openai` | code-editing, fullstack-build, prompt-driven-build | Strong on code generation; good for structured tasks |
| **Gemini** | `gemini` | planning, prompt-driven-build | Good for multimodal; strong on contextual reasoning |
| **Cursor** | `cursor` | code-editing, scaffolding, refactoring | IDE-integrated; excellent for iterative coding |
| **Windsurf** | `windsurf` | fullstack-build, contextual-iteration, repo-navigation | Strong on full-stack; excellent context awareness |
| **AntiGravity** | `antigravity` | planning, scaffolding | Conservative fallback; good for structured planning |

### AdapterCapability Enum

```typescript
type AdapterCapability =
  | "planning"              // Strategic planning, architecture
  | "scaffolding"           // Project scaffolding, templates
  | "code-editing"          // Code modification, refactoring
  | "refactoring"           // Large-scale refactoring
  | "fullstack-build"       // End-to-end application building
  | "prompt-driven-build"   // Generation from natural language
  | "contextual-iteration"  // Iterative refinement with context
  | "repo-navigation"       // Codebase exploration, analysis
```

---

## Provider Adapters

Provider adapters abstract execution backends. Each adapter implements a full lifecycle:

### ProviderAdapter Interface

```typescript
interface ProviderAdapter {
  id: string                                          // Unique ID
  description: string                                 // Human-readable description
  validate(input: unknown): Promise<boolean>          // Input validation
  simulate?(input: unknown): Promise<AdapterSimulationPreview>  // Risk preview
  estimateRisk?(input: unknown): Promise<ExecutionRisk>       // Risk assessment
  execute(input: unknown): Promise<AdapterExecuteResult>       // Execute the action
  verify?(input: unknown, result: AdapterExecuteResult): Promise<AdapterVerificationResult>  // Post-execution verification
  suggestFix?(error: unknown, input: unknown): Promise<string>  // Error recovery suggestions
  rollback?(input: unknown): Promise<void>            // Rollback on failure
}
```

### Execution Risk Levels

```typescript
type ExecutionRisk = "low" | "medium" | "high"

interface AdapterSimulationPreview {
  summary: string              // Plain-English summary
  risk: ExecutionRisk          // Risk level
  requiresApproval?: boolean   // Needs human approval
  blocked?: boolean            // Execution blocked
  reasons?: string[]           // Blocking reasons
  previewData?: Record<string, unknown>  // Simulated output
}
```

### Built-in Provider Adapters

#### GitHub Adapter

**ID:** `github`  
**Purpose:** Create/update/merge pull requests, read repository content  
**Risk Characteristics:** Medium to high (modifies remote repository)  
**Key Operations:**
- Create pull request
- Update existing PR
- Check PR status
- Merge to main branch
- Fetch file content
- List commits

**Token Management:**
- Requires `GITHUB_TOKEN` environment variable
- Token must have repo, workflow, and read:org scopes
- Rate limiting: 5,000 requests/hour per token

**Configuration:**
```typescript
// Automatic via environment
const adapter = new GithubAdapter()

// Uses GITHUB_TOKEN from process.env
// Fails gracefully if token unavailable
```

#### File-System Adapter

**ID:** `file-system`  
**Purpose:** Safe file operations (read, write, delete) with path validation  
**Risk Characteristics:** Low to medium (constrained to project directory)  
**Key Operations:**
- Write files (with parent directory validation)
- Read files (within project bounds)
- Delete files (with existence check)
- List directories

**Safety Features:**
- Rejects absolute paths and parent directory traversal (`../`)
- Validates against project root
- Prevents symlink attacks
- Respects .gitignore restrictions

**Configuration:**
```typescript
const adapter = new FileSystemAdapter()
// Uses current working directory as root
// Blocks access outside project
```

#### Terminal Adapter

**ID:** `terminal`  
**Purpose:** Execute shell commands with environment isolation  
**Risk Characteristics:** High (arbitrary code execution)  
**Key Operations:**
- Execute commands in isolated environment
- Capture stdout/stderr
- Set environment variables
- Control working directory

**Environment Isolation:**
- Runs in subprocess with clean environment
- Custom environment variables supported
- No access to parent process state
- Timeout enforcement (30s default)

**Output Capture:**
```typescript
interface AdapterExecuteResult {
  success: boolean              // Command exit code 0
  output?: string               // stdout + stderr combined
  error?: string                // Error message if failed
  metadata?: {
    exitCode: number
    duration: number            // Milliseconds
    signal?: string             // Kill signal if terminated
  }
}
```

---

## Adapter Selection & Recommendation

### Recommendation Engine

The recommendation engine evaluates adapters against an execution request and ranks them by fit:

```typescript
interface AdapterExecutionRequest {
  projectIdea: string           // Description of work
  mode?: Mode                   // Execution mode (dev, staging, prod)
  report?: RunReport            // Previous execution context
  preferredAction?: "plan" | "generate-files" | "refactor" | "ship-mvp" | "review-repo"
}

// Get recommendations (ranked by fit)
const recommendations = recommendAdapters(request)
// Returns: [{ adapterId: 'claude', fitScore: 0.95, ... }, { adapterId: 'openai', fitScore: 0.85, ... }]

// Select best adapter
const best = selectBestAdapter(request)  // Returns top recommendation
```

### Recommendation Scoring

Each adapter produces a recommendation:

```typescript
interface AdapterRecommendation {
  adapterId: string                    // Adapter ID
  adapterName: string                  // Display name
  fitScore: number                     // 0.0 to 1.0
  recommended: boolean                 // fitScore > 0.7
  reason: string                       // Explanation
  capabilities: AdapterCapability[]    // Matched capabilities
}
```

Scoring factors:
- **Capability match** — Overlap between request and adapter capabilities
- **Mode compatibility** — Adapter suitability for dev/staging/prod
- **Historical context** — Success rate from previous runs (if report provided)
- **Preferred action** — Direct match on preferredAction field

---

## Common Usage Patterns

### 1. Select Best Adapter for Task

```typescript
import { selectBestAdapter, getAvailableAdapters } from '@packages/adapters'

const request = {
  projectIdea: "Refactor auth module to use RBAC",
  mode: 'dev' as const,
  preferredAction: 'refactor'
}

const adapter = selectBestAdapter(request)
console.log(`Selected: ${adapter.name} (fit: ${adapter.recommend(request).fitScore})`)
// Output: Selected: Claude Adapter (fit: 0.95)
```

### 2. Get All Recommendations

```typescript
import { recommendAdapters } from '@packages/adapters'

const request = {
  projectIdea: "Build full-stack feature",
  preferredAction: 'fullstack-build'
}

const recommendations = recommendAdapters(request)
recommendations.forEach(rec => {
  console.log(`${rec.adapterName}: ${rec.fitScore} — ${rec.reason}`)
})
```

### 3. Execute with Provider Adapter

```typescript
import { GithubAdapter } from '@packages/adapters'

const adapter = new GithubAdapter()

// 1. Validate input
const isValid = await adapter.validate({ action: 'create-pr', ... })

// 2. Simulate (estimate risk)
const preview = await adapter.simulate?.({ action: 'create-pr', ... })
console.log(`Risk: ${preview?.risk}, Requires approval: ${preview?.requiresApproval}`)

// 3. Execute
const result = await adapter.execute({ action: 'create-pr', ... })
console.log(`Success: ${result.success}, Output: ${result.output}`)

// 4. Verify result
if (result.success && adapter.verify) {
  const verified = await adapter.verify({ action: 'create-pr', ... }, result)
  console.log(`Verification: ${verified.summary}`)
}
```

### 4. Error Handling with Rollback

```typescript
const adapter = new FileSystemAdapter()

try {
  // Write multiple files
  await adapter.execute({ action: 'write-files', paths: [...] })
} catch (error) {
  // Attempt rollback
  if (adapter.rollback) {
    await adapter.rollback({ action: 'write-files', paths: [...] })
  }
  
  // Get recovery suggestion
  if (adapter.suggestFix) {
    const fix = await adapter.suggestFix(error, { action: 'write-files', paths: [...] })
    console.log(`Suggestion: ${fix}`)
  }
}
```

---

## Adapter Lifecycle

Each provider adapter follows a consistent lifecycle:

```
Input
  ↓
validate() ─→ [Reject if invalid]
  ↓
simulate() ─→ [Risk assessment & preview]
  ↓
estimateRisk() ─→ [Detailed risk scoring]
  ↓
[Human approval if needed]
  ↓
execute() ─→ [Perform action]
  ↓
[Success/Error outcome]
  ↓
verify() ─→ [Validate result state]
  ↓
[Post-execution hooks]
```

### Lifecycle in Code

```typescript
async function executeWithLifecycle(
  adapter: ProviderAdapter,
  input: unknown
): Promise<void> {
  // 1. Validate
  const isValid = await adapter.validate(input)
  if (!isValid) throw new Error('Invalid input')

  // 2. Simulate (preview & risk)
  if (adapter.simulate) {
    const preview = await adapter.simulate(input)
    if (preview.blocked) throw new Error(`Blocked: ${preview.reasons?.join(', ')}`)
    console.log(`Risk level: ${preview.risk}`)
  }

  // 3. Execute
  let result: AdapterExecuteResult
  try {
    result = await adapter.execute(input)
  } catch (error) {
    // Error recovery
    if (adapter.suggestFix) {
      const suggestion = await adapter.suggestFix(error, input)
      console.error(`Fix suggestion: ${suggestion}`)
    }
    throw error
  }

  // 4. Verify
  if (!result.success && adapter.rollback) {
    console.log('Execution failed, rolling back...')
    await adapter.rollback(input)
  } else if (result.success && adapter.verify) {
    const verification = await adapter.verify(input, result)
    console.log(`Verification: ${verification.summary}`)
  }
}
```

---

## Testing Adapters

### Unit Testing Platform Adapters

```typescript
import { describe, it, expect } from 'vitest'
import { selectBestAdapter, recommendAdapters } from '@packages/adapters'

describe('Platform Adapter Recommendation', () => {
  it('selects Claude for refactoring tasks', () => {
    const request = {
      projectIdea: 'Refactor auth module',
      preferredAction: 'refactor' as const
    }
    const adapter = selectBestAdapter(request)
    expect(adapter.id).toBe('claude')
  })

  it('ranks adapters by fit score', () => {
    const request = { projectIdea: 'Build full-stack feature' }
    const recommendations = recommendAdapters(request)
    expect(recommendations[0].fitScore).toBeGreaterThanOrEqual(recommendations[1].fitScore)
  })
})
```

### Unit Testing Provider Adapters

```typescript
describe('GitHub Adapter', () => {
  it('validates PR creation input', async () => {
    const adapter = new GithubAdapter()
    const valid = await adapter.validate({ action: 'create-pr', title: 'Test' })
    expect(valid).toBe(true)
  })

  it('estimates risk for PR creation', async () => {
    const adapter = new GithubAdapter()
    const preview = await adapter.simulate?.({ action: 'create-pr', branch: 'main' })
    expect(['low', 'medium', 'high']).toContain(preview?.risk)
  })
})
```

---

## Error Handling

### Common Error Scenarios

| Scenario | Adapter Type | Recovery |
|----------|--------------|----------|
| Token expired | Platform/GitHub | Refresh token, retry with new token |
| Network timeout | Platform/GitHub | Exponential backoff, alternative adapter |
| Path traversal attempt | File-system | Reject, log security event |
| Permission denied | File-system/Terminal | Check permissions, suggest elevation |
| Command timeout | Terminal | Kill subprocess, suggest simpler command |
| Risk threshold exceeded | Any | Require approval, block execution |

### Best Practices

1. **Validate early** — Check input in validate() phase
2. **Simulate before execution** — Always call simulate() if available
3. **Provide recovery** — Implement suggestFix() for user guidance
4. **Enable rollback** — Implement rollback() for state cleanup
5. **Log errors contextually** — Include adapter ID, input summary, error details

---

## Gotchas & Known Limitations

1. **Token Management**
   - GitHub token stored in environment variable (not secure for untrusted environments)
   - Consider using credential managers in production
   - Token rotation not automated

2. **Adapter Dependencies**
   - Platform adapters depend on external API availability
   - Provider adapters may have cascading failures (e.g., GitHub unavailable → PR creation fails)
   - No built-in circuit breaker or fallback chain

3. **Cross-Adapter Race Conditions**
   - Concurrent file-system writes from terminal and file-system adapters can conflict
   - No file locking mechanism; serialize operations or use filesystem watch

4. **Risk Estimation**
   - Risk levels are estimates; high-risk operations can still succeed
   - No audit trail of what was approved; consider external approval system

5. **File-System Constraints**
   - Symlink detection is basic; advanced symlink attacks possible
   - Large file operations may timeout; no streaming support
   - No atomic multi-file operations

6. **Terminal Execution**
   - 30-second timeout hardcoded; increase for long-running tasks
   - No output streaming; large outputs stored in memory
   - Environment isolation is process-level only; not containerized

---

## Cross-References

**Depends on:**
- `@packages/shared` — Type definitions (Mode, RunReport)

**Used by:**
- `apps/control-service` — Adapter selection for run execution
- `apps/cli` — Platform adapter recommendations
- `packages/skill-engine` — Provider adapter dispatch
- `packages/learning` — Historical adapter performance tracking

**Related Documentation:**
- [Root CLAUDE.md](../../CLAUDE.md) — Project overview
- [Architecture Guide](../../docs/ARCHITECTURE.md) — System design
- [API Documentation](../../docs/DEPLOYMENT.md) — Integration examples
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md) — Common adapter issues

---

## File Structure

```
packages/adapters/
├── src/
│   ├── index.ts                      # Exports, convenience functions
│   ├── types.ts                      # PlatformAdapter, AdapterCapability types
│   ├── base/
│   │   └── provider-adapter.ts       # ProviderAdapter interface
│   ├── antigravity-adapter.ts        # AntiGravity implementation
│   ├── claude-adapter.ts             # Claude implementation
│   ├── cursor-adapter.ts             # Cursor implementation
│   ├── gemini-adapter.ts             # Gemini implementation
│   ├── openai-adapter.ts             # OpenAI implementation
│   ├── windsurf-adapter.ts           # Windsurf implementation
│   └── providers/
│       ├── github-adapter.ts         # GitHub provider
│       ├── github-adapter.test.ts    # GitHub tests
│       ├── file-system-adapter.ts    # File-system provider
│       └── terminal-adapter.ts       # Terminal provider
├── package.json
└── README.md
```
