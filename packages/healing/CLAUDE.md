# Healing Package — Claude Code Context

## Quick Overview

The **healing** package implements self-healing and automated remediation for execution failures. When steps fail, healing strategies analyze the failure, select an appropriate recovery action (retry, rollback, skip, or custom), and attempt to heal the execution without manual intervention. All healing attempts are logged and tracked for reliability metrics.

## Core Architecture

### Failure Classification

The `failure-classifier.ts` module detects failure types from error messages and adapter context:

| Failure Type | Detection Pattern | Confidence | Typical Action |
|--------------|------------------|------------|-----------------|
| `path-not-found` | "ENOENT", "no such file", "path not found" | 0.92 | Create missing directory |
| `permission-denied` | "permission denied", "EACCES" | 0.90 | Suggest allowlisted alternative |
| `policy-blocked` | "not allowed", "blocked by policy" | 0.88 | Suggest allowlisted alternative |
| `git-auth-failed` | GitHub adapter + ("auth", "token", "unauthorized") | 0.87 | Retry with valid credentials |
| `branch-diverged` | GitHub adapter + ("branch", "diverged") | 0.81 | Rebase or force-push |
| `verification-failed` | "verify", "verification failed" | 0.80 | Skip no-op PR creation |
| `network-transient` | "timeout", "network" | 0.76 | Retry once after delay |
| `unknown-failure` | No canonical mapping | 0.45 | Escalate to human review |

**Classification function:**
```typescript
function classifyFailure(errorMessage: string, adapterId: string): FailureClassification {
  // Returns: { failureType, confidence, reason }
}
```

### Healing Strategy Registry

The `healing-strategy-registry.ts` defines available recovery strategies:

| Strategy ID | Failure Type | Adapter | Risk | Auto-Apply | Purpose |
|-----------|------------|---------|------|-----------|---------|
| `create-missing-directory` | path-not-found | file-system | low | yes | Create parent directory before retrying |
| `normalize-relative-path` | path-not-found | file-system | low | yes | Normalize path formatting |
| `retry-transient-command` | network-transient | terminal | low | yes | Retry after exponential backoff |
| `suggest-allowlisted-alternative` | policy-blocked | terminal | low | no | Suggest safe alternative command |
| `skip-no-op-pr` | verification-failed | github | low | no | Skip PR if diff is empty |

**Strategy structure:**
```typescript
interface HealingStrategy {
  id: string
  failureType: string
  adapterId: string
  title: string
  description: string
  risk: 'low' | 'medium' | 'high'
  autoApply: boolean
  maxAttempts: number
  preconditions: string[]
  apply: (context: HealingContext) => Promise<HealingResult>
}
```

**Finding candidates:**
```typescript
function findCandidateStrategies(failureType: string, adapterId: string): HealingStrategy[]
```

### Healing Engine

The `healing-engine.ts` is the core orchestrator:

1. **Load healing policy** from `config/healing-policy.json`
2. **Classify failure** using failure classifier
3. **Find candidate strategies** matching failure type and adapter
4. **Rank strategies** by risk (low → medium → high)
5. **Check approval requirements** based on policy
6. **Execute selected strategy** if approved
7. **Revalidate** post-healing (optional)
8. **Record outcome** to healing store

**Main function:**
```typescript
async function attemptHealing(input: HealingContext): Promise<HealingAttempt> {
  // Returns: { id, runId, stepId, status, selectedStrategyId, result, summary }
}
```

**Healing attempt states:**
- `planned` — Healing selected, awaiting execution
- `awaiting-approval` — Strategy selected but requires human approval
- `verified` — Healing executed and revalidation passed
- `failed` — Healing executed but failed or revalidation failed
- `escalated` — No suitable strategy found or healing disabled

### Revalidation Engine

The `revalidation.ts` module verifies healing success:

```typescript
async function revalidateAfterHeal(context: HealingContext): Promise<RevalidationResult> {
  // Adapter-specific verification (e.g., file existence for file-system)
}
```

**Revalidation types:**
- **File-system adapter:** Check target file/directory exists
- **GitHub adapter:** Verify branch state is clean
- **Terminal adapter:** Re-run health checks
- **Other adapters:** Pass by default (no specialized verification)

### Healing Store

The `healing-store.ts` manages persistent healing state:

```typescript
// Load all healing attempts for a run
function loadHealingAttempts(runId: string): HealingAttempt[]

// Save healing attempts
function saveHealingAttempts(runId: string, attempts: HealingAttempt[]): void

// Track success rate and performance metrics
function updateHealingStats(strategyId: string, success: boolean, durationMs: number): HealingStrategyStats[]
```

**Storage locations:**
- `.codekit/runs/{runId}/healing-log.json` — Per-run healing attempts
- `.codekit/healing/healing-stats.json` — Cumulative strategy statistics

## Healing Strategy Decision Tree

```
Step fails
  ↓
Classify failure type (error message + adapter)
  ↓
Find candidate strategies for (failureType, adapterId)
  ↓
Rank by risk (low → medium → high)
  ├─ No candidates found
  │   └─ Status: escalated, escalate to human review
  │
  ├─ Healing disabled by policy
  │   └─ Status: escalated, log classification only
  │
  ├─ Policy mode = "observe"
  │   └─ Status: escalated, log but don't heal
  │
  └─ Select first (lowest-risk) strategy
      ├─ Requires approval?
      │   └─ Status: awaiting-approval, wait for human
      │
      └─ Auto-apply allowed?
          ├─ Execute healing strategy
          ├─ Revalidate result (optional)
          ├─ Record success/failure
          └─ Status: verified or failed
```

## Policy Configuration

Healing behavior is controlled by `config/healing-policy.json`:

```json
{
  "enabled": true,
  "mode": "auto",
  "approvalRequiredForStrategies": [
    "suggest-allowlisted-alternative",
    "skip-no-op-pr"
  ],
  "allowAutoApplyForRisk": ["low", "medium"],
  "maxHealingAttemptsPerStep": 3,
  "healingTimeoutMs": 30000
}
```

**Mode values:**
- `"observe"` — Classify failures but don't execute healing (learn mode)
- `"manual"` — Classify and select strategy but require human approval
- `"auto"` — Auto-apply low-risk strategies, require approval for medium/high-risk

**Approval workflow:**
1. Healing strategy selected but requires approval
2. Healing attempt status set to `awaiting-approval`
3. Human reviews attempt via control-service UI
4. Approval endpoint approves/rejects
5. Approved: execute strategy
6. Rejected: mark as escalated

## Key Patterns

### Defining Custom Healing Strategies

Add to `healing-strategy-registry.ts`:

```typescript
async function customHealingLogic(context: HealingContext): Promise<HealingResult> {
  const { stepId, errorMessage, adapterId, payload, context: executionContext } = context
  
  // Your custom logic here
  const success = await someRecoveryAction(payload)
  
  return {
    success,
    changedResources: [/* list of affected resources */],
    notes: `Custom healing: ${success ? 'succeeded' : 'failed'}`,
    requiresRetry: success,
    requiresReverification: success
  }
}

// Register in getHealingStrategies()
{
  id: 'custom-strategy',
  failureType: 'my-custom-failure',
  adapterId: 'my-adapter',
  title: 'Custom recovery action',
  description: 'Perform custom recovery',
  risk: 'medium',
  autoApply: false,
  maxAttempts: 1,
  preconditions: ['custom precondition check'],
  apply: customHealingLogic
}
```

### Adapter-Specific Healing

Strategies are scoped to specific adapters (file-system, github, terminal) or universally applicable (`adapterId: 'any'`):

```typescript
// File-system specific
{ adapterId: 'file-system', failureType: 'path-not-found', ... }

// GitHub specific
{ adapterId: 'github', failureType: 'git-auth-failed', ... }

// Terminal specific
{ adapterId: 'terminal', failureType: 'policy-blocked', ... }

// Any adapter
{ adapterId: 'any', failureType: 'unknown-failure', ... }
```

## Testing

| Command | Purpose |
|---------|---------|
| `pnpm run test:unit` | All unit tests (includes healing tests) |
| `pnpm run test:coverage` | Coverage report (target 80%+) |

**Test patterns:**

```typescript
describe('healing-engine', () => {
  it('classifies path-not-found failure', () => {
    const result = classifyFailure('ENOENT: no such file', 'file-system')
    expect(result.failureType).toBe('path-not-found')
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it('finds candidate strategies for failure type', () => {
    const candidates = findCandidateStrategies('path-not-found', 'file-system')
    expect(candidates).toHaveLength(2) // create-missing-directory, normalize-relative-path
  })

  it('executes healing attempt with auto-apply strategy', async () => {
    const attempt = await attemptHealing({
      runId: 'run-123',
      stepId: 'step-1',
      errorMessage: 'ENOENT: /tmp/missing',
      adapterId: 'file-system',
      payload: { path: '/tmp/missing/file.txt' }
    })
    expect(attempt.status).toBe('verified')
    expect(attempt.selectedStrategyId).toBe('create-missing-directory')
  })

  it('escalates when healing disabled', async () => {
    mockPolicy({ enabled: false })
    const attempt = await attemptHealing({ /* ... */ })
    expect(attempt.status).toBe('escalated')
  })

  it('requires approval for high-risk strategy', async () => {
    mockPolicy({ mode: 'manual' })
    const attempt = await attemptHealing({ /* ... */ })
    expect(attempt.status).toBe('awaiting-approval')
  })
})
```

**Test fixtures:**
- Mock `loadHealingPolicy()` for policy-dependent tests
- Mock strategy `apply()` functions for controlled execution
- Use real file-system operations for revalidation tests (with cleanup)
- Mock adapter calls for network tests

## Healing Statistics and Observability

Healing tracks success rates per strategy:

```typescript
interface HealingStrategyStats {
  strategyId: string
  attempts: number
  successes: number
  successRate: number // 0.0 - 1.0
  avgRepairTimeMs: number
  updatedAt: string // ISO timestamp
}
```

**Sample output from `.codekit/healing/healing-stats.json`:**
```json
[
  {
    "strategyId": "create-missing-directory",
    "attempts": 45,
    "successes": 43,
    "successRate": 0.956,
    "avgRepairTimeMs": 12.3,
    "updatedAt": "2026-04-26T14:32:15Z"
  },
  {
    "strategyId": "normalize-relative-path",
    "attempts": 8,
    "successes": 8,
    "successRate": 1.0,
    "avgRepairTimeMs": 5.1,
    "updatedAt": "2026-04-26T14:32:15Z"
  }
]
```

Use these metrics to:
- Monitor healing effectiveness (success rate trends)
- Identify underperforming strategies
- Tune approval policies (promote high-confidence strategies to auto-apply)
- Optimize healing selection (prefer higher success rates)

## Gotchas

1. **Healing loops** — If a healing strategy's output triggers the same failure type, execution can loop indefinitely. Enforce `maxAttempts` per step strictly.

2. **Partial rollbacks** — If a strategy modifies multiple resources and later fails, some changes may persist. Use `changedResources` in results to enable manual cleanup.

3. **Distributed state conflicts** — In multi-server deployments, healing attempts on one server may conflict with concurrent changes on another. Healing store uses local file-system; coordinate via distributed lock (future enhancement).

4. **Revalidation assumptions** — File-system revalidation checks path existence but doesn't verify file content/permissions. Adapt revalidation logic per adapter.

5. **Policy reload** — Changes to `config/healing-policy.json` require service restart (policy loaded once at startup). Consider dynamic policy loading for future versions.

6. **Cascading failures** — If revalidation itself fails (e.g., file-system unavailable), healing is marked as failed even if the original healing succeeded. Separate concerns: healing vs verification.

7. **Approval timeout** — `awaiting-approval` status has no timeout; if human never approves/rejects, execution stalls. Consider timeout mechanism with auto-escalation.

## Cross-References

**Depends on:**
- [shared](../shared/CLAUDE.md) — HealingContext, HealingStrategy, HealingAttempt types
- [orchestrator](../orchestrator/CLAUDE.md) — Invokes healing when steps fail

**Used by:**
- [control-service](../../apps/control-service/CLAUDE.md) — Approval endpoints, healing UI
- [orchestrator](../orchestrator/CLAUDE.md) — Failure recovery in step execution

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo overview
- [System Architecture](../../docs/ARCHITECTURE.md) — Healing in execution flow
- [Testing Guide](../../docs/TESTING.md) — Healing test patterns
