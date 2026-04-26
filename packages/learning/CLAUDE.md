# Learning Package — Claude Code Context

## Quick Overview

The **learning package** implements an outcome-driven feedback loop that observes execution results and continuously refines the governance policy. It consists of five interconnected engines:

1. **Outcome Engine** — Records run results and metadata
2. **Pattern Engine** — Extracts failure patterns and trends
3. **Reliability Engine** — Computes adapter/skill confidence scores
4. **Adaptive Policy Engine** — Generates policy overlays (risk multipliers, approval requirements, retry limits)
5. **Learning Cycle Manager** — Orchestrates the full feedback loop

**Key outcome:** Policies adapt automatically. As agents and skills prove reliable (or unreliable), their enforcement rules tighten or relax accordingly.

---

## Architecture

### Execution Flow

```
Completed Run
    ↓
recordRunOutcome() (outcome-engine)
    ↓
Store outcome + metadata
    ↓
applyLearningCycle()
    ├─ updatePatterns() → identify failure trends
    ├─ rebuildReliability() → compute adapter scores
    ├─ buildAdaptivePolicyOverlays() → generate policy adjustments
    └─ saveLearningState() → persist updated state
    ↓
Next run uses updated policy
```

### Five Engines

#### 1. Outcome Engine (`outcome-engine.ts`)

Records **run outcome** with full execution context:

```typescript
export interface RunOutcomeInput {
  runId: string
  result: 'success' | 'failure' | 'partial'
  postExecutionScore: number        // Quality metric (0–1)
  rollbackOccurred: boolean
  humanOverride: boolean
  riskLevel: 'low' | 'medium' | 'high'
  adaptersUsed: string[]            // Which adapters executed
  failureDetails?: {
    dominantFailureType: string
    // ...
  }
}
```

Outcome also emitted to observability memory-graph for correlation analysis.

#### 2. Pattern Engine (`pattern-engine.ts`)

Tracks **failure patterns** by adapter and failure type:

```typescript
export interface FailurePattern {
  id: string                        // "adapter-id::failure-type"
  adapterId: string
  failureType: string
  fixSuggestion: string
  confidence: number                // 0.55–0.95 (learns over time)
  occurrences: number               // How many times seen
  lastSeenAt: string                // ISO timestamp
}
```

**Learning rule:** Confidence increases by 0.05 per occurrence (capped at 0.95). Once 3+ occurrences → pattern triggers approval requirement in overlay.

#### 3. Reliability Engine (`reliability-engine.ts`)

Computes **adapter reliability score** using weighted formula:

```typescript
reliabilityScore = 
  successRate * 0.6                 // 60% weight: success/total
  + (1 - min(avgRetries, 3) / 3) * 0.2  // 20% weight: retry efficiency
  + qualityScore * 0.2              // 20% weight: execution quality
```

Example: Adapter with 80% success rate, avg 1.5 retries, 0.8 quality → score = 0.48 \* 0.6 + 0.5 \* 0.2 + 0.8 \* 0.2 = 0.616

#### 4. Adaptive Policy Engine (`adaptive-policy.ts`)

Generates **policy overlays** that tighten constraints for unreliable adapters:

```typescript
export interface AdaptivePolicyOverlay {
  adapterId: string
  riskMultiplier: number            // 0.9 (trusted) → 1.4 (risky)
  suggestedMaxRetries: number       // 2 (reliable) → 1 (unreliable)
  requireApproval: boolean          // true if score < 0.75 OR 3+ failures
  reason: string
  updatedAt: string
}
```

**Decision logic:**
- If reliabilityScore < 0.7 → riskMultiplier = 1.4
- If reliabilityScore > 0.9 → riskMultiplier = 0.9
- If reliabilityScore < 0.75 OR repeated failures → requireApproval = true

#### 5. Learning Cycle Manager (`learning-engine.ts` + `index.ts`)

Orchestrates full feedback loop on each outcome:

```typescript
const result = applyLearningCycle({
  state: currentLearningState,
  outcome: runOutcome
})
// Returns: {
//   updatedState: {...},
//   policyDiff: {...},              // What changed
//   constraintSuggestions: [...],   // Recommendations
//   summary: "Processed outcome..."
// }
```

---

## State and Storage

### Learning State (`store.ts`)

```typescript
export interface LearningState {
  agentProfiles: Record<string, AgentProfile>
  thresholdPolicy: ThresholdPolicy
  skillStats: Record<string, SkillStats>
}
```

**Persisted to:** `learning-store.json` (project root or XDG data dir)

### Outcomes History

All outcomes appended to `outcomes.jsonl` (newline-delimited JSON):

```
{"runId": "run-123", "result": "success", ...}
{"runId": "run-124", "result": "failure", ...}
```

This log is the source of truth for pattern analysis and reliability calculation.

---

## Key Patterns

### 1. Immutability

All state updates return new objects (never mutate in place):

```typescript
// Pattern engine example
export function updatePatterns(
  existing: FailurePattern[],
  outcome: RunOutcome
): FailurePattern[] {
  // Return new array, never modify existing
  return [
    ...existing,
    { id, adapterId, ... }  // new pattern
  ]
}
```

### 2. Confidence Learning

Patterns and reliability scores build confidence gradually:

```typescript
// Failure pattern confidence
found.confidence = Math.min(0.95, found.confidence + 0.05)  // +5% per occurrence

// Reliability score (rebuilt from all outcomes)
reliabilityScore = weightedFormula(successRate, avgRetries, qualityScore)
```

### 3. Multi-Dimensional Scoring

Reliability isn't just success rate—it combines:
- **Success rate** (60%) — Did it work?
- **Retry efficiency** (20%) — How many retries needed?
- **Quality score** (20%) — How good was the output?

This prevents one dimension from dominating.

### 4. Policy Overlays (Not Replacement)

Adaptive policy generates **overlays**—recommendations applied on top of base policy:

```
Base policy: "All adapters default to 2 max retries"
    ↓
Overlay (learned): "GitHub adapter is unreliable → require approval + 1 retry limit"
    ↓
Effective policy: "GitHub uses 1 retry + approval gate"
```

---

## Testing

### Unit Tests

Test each engine independently:

```typescript
// Test pattern learning
describe('pattern-engine', () => {
  it('increments occurrences and confidence', () => {
    const outcome = { success: false, dominantFailureType: 'auth', ... }
    const updated = updatePatterns([...], outcome)
    // Verify: new pattern with confidence 0.55, occurrences: 1
  })

  it('caps confidence at 0.95', () => {
    const existing = [{ ..., occurrences: 9, confidence: 0.9 }]
    const updated = updatePatterns(existing, outcome)
    // Verify: confidence = 0.95, not 0.95+
  })
})

// Test reliability calculation
describe('reliability-engine', () => {
  it('weights success rate, retries, quality', () => {
    const outcomes = [
      { success: true, retryCount: 1, qualityScore: 0.8, ... },
      { success: true, retryCount: 2, qualityScore: 0.9, ... },
      { success: false, retryCount: 3, qualityScore: 0.2, ... },
    ]
    const reliability = rebuildReliability(outcomes)
    // Verify: score ≈ 0.616 (calculated above)
  })
})
```

### Integration Tests

Test full learning cycle:

```typescript
describe('learning cycle', () => {
  it('processes outcome and updates all state', async () => {
    const state = loadLearningState()
    const outcome = { runId: 'run-123', result: 'failure', ... }
    const result = applyLearningCycle({ state, outcome })
    
    // Verify: state updated, policy diff recorded, suggestions generated
    expect(result.updatedState.thresholdPolicy).toBeDefined()
    expect(result.policyDiff).toHaveProperty('changes')
    expect(result.summary).toContain('Processed outcome')
  })
})
```

### Coverage Target

**85%+** across all engines. Integration tests cover happy path (outcome → state update). Unit tests cover edge cases (cap at 0.95 confidence, retry efficiency weighting).

---

## Gotchas

### 1. Feedback Loop Oscillation

**Problem:** Policy becomes too strict → approvals reject legitimate runs → outcome classified as "failure" → policy becomes even stricter → system loops.

**Mitigation:** 
- Confidence capping (max 0.95) prevents infinite drift
- Policy overlays are additive (tighter constraints), never relaxed automatically
- Manual policy review required to loosen constraints

### 2. Stale Data & Survivor Bias

**Problem:** If you stop running a type of task (e.g., risky deploys), its reliability score becomes frozen at an old value.

**Mitigation:**
- Track `updatedAt` timestamp; alert operators if overlay > 30 days old
- Consider decay factor (gradually reduce confidence if no new outcomes)
- Review periodically: `buildLearningReport()` shows strongest/weakest adapters

### 3. Low-Frequency Tasks

**Problem:** A task that runs once per month builds confidence slowly (need 3 occurrences for pattern).

**Mitigation:**
- Pattern confidence starts at 0.55, not 0.0 (give benefit of doubt)
- Use heuristic defaults (e.g., "GitHub auth failures → check token")
- Combine with manual policy annotations (don't rely only on learning)

### 4. Outcome Data Quality

**Problem:** If `dominantFailureType` or `adaptersUsed` not filled correctly, learning fails silently.

**Mitigation:**
- Validate `RunOutcomeInput` with schema (Zod)
- Log warning if fields missing; don't process outcome
- Audit outcomes log regularly for gaps

### 5. Policy Deployment Lag

**Problem:** Policy updated but control-service still uses cached config.

**Mitigation:**
- Learning cycle saves policy diff + generated overlays
- Service must reload config (e.g., on SIGHUP or endpoint)
- Document: "Policy changes require service restart or reload endpoint"

---

## Integration Points

### Outcome Recording

Control-service handler calls:
```typescript
import { recordRunOutcome } from '@cku/learning'

// After execution completes
const outcome = {
  runId,
  result: success ? 'success' : 'failure',
  postExecutionScore: computeQuality(result),
  rollbackOccurred: steps.some(s => s.rolled_back),
  ...
}
recordRunOutcome(outcome)  // Triggers learning cycle
```

### Policy Application

Governance gates use overlays:
```typescript
import { buildLearningReport } from '@cku/learning'

const report = buildLearningReport()
const overlay = report.overlays.find(o => o.adapterId === currentAdapter)

if (overlay?.requireApproval) {
  gateManager.requireApprovalFor(gate)
}
if (overlay?.riskMultiplier) {
  risk = computeRisk(base) * overlay.riskMultiplier
}
```

### Observability

Outcomes also emit to memory-graph:
```typescript
appendMemoryGraphEvent({
  type: 'outcome_recorded',
  runId,
  data: { result, postExecutionScore, rollbackOccurred, ... }
})
```

---

## Feedback Loop Mechanics

### Step-by-Step Example

**Setup:**
- GitHub adapter has had 2 failures (confidence: 0.65, occurrences: 2)
- Base reliability score: 0.7 (borderline)

**Run 1:** GitHub deploy fails (3rd failure)
```
1. recordRunOutcome({ result: 'failure', dominantFailureType: 'auth', adaptersUsed: ['github'], ... })
2. updatePatterns: Find existing GitHub::auth pattern
   - occurrences: 2 → 3
   - confidence: 0.65 + 0.05 = 0.70
3. rebuildReliability: Recalculate GitHub adapter score
   - Now 3 failures / N runs → reliability ≈ 0.68 (down from 0.7)
4. buildAdaptivePolicyOverlays:
   - GitHub reliability < 0.75 AND occurrences ≥ 3 → requireApproval = true
   - Overlay created: { adapterId: 'github', riskMultiplier: 1.3, suggestedMaxRetries: 1, requireApproval: true }
5. saveLearningState: Store updated state
6. Policy report generated (markdown + JSON)
```

**Result:** Next GitHub deploy requires approval gate + 1-retry limit (instead of 2).

**Run 2:** GitHub deploy succeeds (operator approved)
```
1. recordRunOutcome({ result: 'success', adaptersUsed: ['github'], ... })
2. updatePatterns: GitHub::auth pattern not updated (pattern only on failure)
3. rebuildReliability: Recalculate GitHub score
   - Now 3 failures + 1 success / N runs → reliability ≈ 0.72 (slight recovery)
4. buildAdaptivePolicyOverlays:
   - Still requireApproval (confidence < 0.75 + 3+ failures)
   - Overlay persists
```

**Result:** Overlay remains until 5+ more successes occur or manual policy change.

---

## Commands and Utilities

### Running the Learning Cycle

```typescript
import { applyLearningCycle, recordRunOutcome } from '@cku/learning'

const outcome = { runId: 'run-123', result: 'failure', ... }
recordRunOutcome(outcome)  // Persists + emits

const state = loadLearningState()
const result = applyLearningCycle({ state, outcome })
console.log(result.summary)
// "Processed outcome for run-123. Updated 5 agent profiles. Policy changes: 2. ..."
```

### Generating Reports

```typescript
import { buildLearningReportJson, buildLearningReportMarkdown } from '@cku/learning'

const state = loadLearningState()
const json = buildLearningReportJson(state, result)
const md = buildLearningReportMarkdown(result)

// Save to disk
fs.writeFileSync('learning-report.json', JSON.stringify(json, null, 2))
fs.writeFileSync('learning-report.md', md)
```

### Accessing Outcomes

```typescript
import { loadLearningState } from '@cku/learning'

const state = loadLearningState()
console.log(`Total outcomes: ${state.outcomes.length}`)
console.log(`Strongest adapters:`, state.reliability.sort(by reliabilityScore).slice(0, 3))
console.log(`Recent patterns:`, state.patterns.filter(p => p.occurrences >= 3))
```

---

## Configuration

No explicit config file for learning (stateless engines). Behavior controlled via code constants:

```typescript
// pattern-engine.ts
const INITIAL_CONFIDENCE = 0.55
const MAX_CONFIDENCE = 0.95
const CONFIDENCE_INCREMENT = 0.05

// reliability-engine.ts
const WEIGHTS = {
  successRate: 0.6,
  retryEfficiency: 0.2,
  qualityScore: 0.2,
}

// adaptive-policy.ts
const RISK_THRESHOLDS = {
  high: 1.4,  // score < 0.7
  normal: 1.0,
  low: 0.9,   // score > 0.9
}
```

To customize, modify constants in respective source files.

---

## Development Workflow

### Adding a New Learning Engine

1. **Define types** in `shared/governance-types.ts`
2. **Create engine file** (e.g., `packages/learning/src/new-engine.ts`)
3. **Implement core function** (immutable, pure if possible)
4. **Integrate into learning cycle** in `index.ts`
5. **Add tests** with mocks for dependencies
6. **Update documentation** (this file)

Example: Adding a "feedback score learning" engine:

```typescript
// feedback-learning.ts
export function updateFeedbackScores(
  existing: FeedbackScore[],
  outcome: RunOutcomeInput
): FeedbackScore[] {
  // Learn from operator feedback
  return [...]
}

// index.ts
const feedbackScores = updateFeedbackScores(params.state.feedbackScores, params.outcome)
const updatedState = { ..., feedbackScores }
```

### Debugging Learning State

```bash
# Inspect current learning state
cat learning-store.json | jq '.reliability | sort_by(.reliabilityScore)'

# View recent outcomes
tail -20 outcomes.jsonl

# Check pattern trends
cat learning-store.json | jq '.patterns | sort_by(.occurrences) | reverse | .[0:5]'
```

---

## Performance Considerations

### Outcome Recording (Hot Path)

- `recordRunOutcome()` appends to outcomes log (O(1) write)
- Memory-graph emit is async, non-blocking
- Learning cycle runs **after** outcome recorded (eventual consistency)

### Learning Cycle (Batch Process)

- `rebuildReliability()` recalculates from **all outcomes** (O(N) where N = number of outcomes)
- For 10k outcomes, expect ~50ms rebuild time
- Consider: Running learning cycle asynchronously or on schedule (e.g., hourly)

### State Persistence

- `saveLearningState()` writes to disk (O(1) with small state size)
- No database required—JSON files sufficient for current scale

### Scaling Recommendations

- **10–100k outcomes:** Current approach fine (learning cycle ~50–200ms)
- **100k+ outcomes:** Consider:
  - Archiving old outcomes (move to separate file)
  - Running learning cycle on schedule (not per-outcome)
  - Aggregating outcomes in batches

---

## Monitoring & Observability

### Key Metrics

```typescript
import { metrics } from '@cku/observability'

metrics.recordOutcomeProcessed(outcome.result)  // success/failure/partial
metrics.recordPatternDetected(pattern.adapterId, pattern.occurrences)
metrics.recordReliabilityChange(adapterId, oldScore, newScore)
metrics.recordOverlayApplied(overlay.adapterId, overlay.riskMultiplier)
```

### Learning Report (Manual Review)

```bash
# Generate report
pnpm --filter learning run report

# Shows:
# - Top 3 strongest adapters (highest reliabilityScore)
# - Top 3 weakest adapters (lowest reliabilityScore)
# - Top 5 failure patterns (most occurrences)
# - Active policy overlays
```

---

## Cross-References

**Depends on:**
- [shared](../shared/CLAUDE.md) — Governance types, RunOutcomeInput
- [observability](../observability/CLAUDE.md) — Memory-graph event emission
- [governance](../governance/CLAUDE.md) — Policy evaluation (uses overlays)
- [control-service](../../apps/control-service/CLAUDE.md) — Triggers outcome recording

**Used by:**
- [governance](../governance/CLAUDE.md) — Applies overlays to gate decisions
- [control-service](../../apps/control-service/CLAUDE.md) — Records outcomes, reads reports
- [orchestrator](../orchestrator/CLAUDE.md) — May adjust execution based on reliability scores

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo overview
- [System Architecture](../../docs/ARCHITECTURE.md) — Feedback loop diagram
- [Testing Guide](../../docs/TESTING.md) — Learning package test patterns
- [Config Schema](../../docs/CONFIG_SCHEMA.md) — Policy.json reference
