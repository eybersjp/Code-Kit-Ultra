# Observability Package

## Quick Overview

The **observability** package provides comprehensive tracing, logging, and decision visualization for governance and execution flows in Code-Kit-Ultra.

**Key capabilities:**
- **Governance Trace Engine** — Captures intent, constraints, validation, consensus, and confidence for every execution decision
- **Structured JSON Logging** — Compliant with HeliosOS observability requirements (newline-delimited JSON)
- **Timeline Events** — Fine-grained event sequencing with phases and metadata
- **Trace Store** — Persistent local storage of traces, timelines, and markdown reports
- **Score Explanation** — Human-readable breakdowns of confidence scoring
- **Report Rendering** — Markdown generation for audit trails and decision documentation

**Tech Stack:**
- TypeScript
- Node.js fs/path (local storage)
- Structured JSON logging (process.stdout/stderr)

---

## Architecture

### Core Concepts

#### 1. **Governance Trace**
A complete record of a single execution decision, capturing all decision-making factors:

```typescript
interface GovernanceTrace {
  runId: string                          // Unique execution ID
  summary: string                        // Decision summary
  mode?: string                          // Execution mode (dev/staging/prod)
  createdAt: string                      // ISO timestamp
  intent: IntentTrace                    // Intent parsing result
  constraints: ConstraintTrace           // Constraint compliance check
  validation: ValidationTrace            // Batch/payload validation
  consensus: ConsensusTrace              // Weighted agent voting
  confidence: ConfidenceTrace            // Computed confidence score
  finalDecision: GovernanceDecision      // Final decision: execute/blocked/paused
  finalReason: string                    // Detailed reason for decision
  suggestedAction?: string               // Recommended next action
}
```

#### 2. **Confidence Trace**
Quantified confidence in a decision, derived from weighted components:

```typescript
interface ConfidenceTrace {
  score: number                     // Overall confidence [0.0-1.0]
  threshold: number                 // Approval threshold (typically 0.7)
  components: ConfidenceComponent[] // Breakdown of score
  reason: string                    // Human-readable justification
}

interface ConfidenceComponent {
  key: string                       // Component identifier
  label: string                     // Display name
  score: number                     // Component score [0.0-1.0]
  weight: number                    // Weight in confidence calculation
  note?: string                     // Explanation
}
```

Default components (if not overridden):
- **Intent Alignment** (25%) — Does the intent match allowed patterns?
- **Constraint Compliance** (30%) — Any blocking policy violations?
- **Validation Integrity** (20%) — Is the batch structure valid?
- **Consensus Strength** (25%) — What do weighted agents vote?

#### 3. **Trace Engine**
Builds a complete governance trace from decision inputs.

Input structure:
```typescript
interface TraceEngineInput {
  runId: string
  summary: string                      // Decision summary
  mode?: string                        // Execution mode
  intent: IntentTrace                  // From intent parser
  constraints: ConstraintTrace         // From constraint checker
  validation: ValidationTrace          // From validation layer
  consensus: ConsensusTrace            // From consensus engine
  confidenceComponents?: ConfidenceComponent[]  // Optional override
  confidenceThreshold?: number         // Approval threshold (default 0.7)
}
```

Key functions:
- `deriveConfidenceTrace(components, threshold)` — Calculates weighted confidence
- `deriveDefaultConfidenceComponents(input)` — Builds default component scores from traces
- `buildGovernanceTrace(input)` — Assembles complete governance trace with final decision

#### 4. **Timeline Events**
Ordered sequence of execution phases with millisecond resolution:

```typescript
interface TimelineEvent {
  id: string                            // Unique event ID
  runId: string                         // Associated run
  at: string                            // ISO timestamp
  phase: string                         // Lifecycle phase (e.g., "intent-parse")
  event: string                         // Event name
  detail: string                        // Human-readable detail
  level: "info" | "warn" | "error"     // Severity
  metadata?: Record<string, unknown>    // Extra data
}
```

#### 5. **Structured Logging**
JSON logger compliant with HeliosOS observability rules:

```typescript
interface LogEntry {
  level: LogLevel                       // "debug" | "info" | "warn" | "error"
  message: string                       // Log message
  timestamp: string                     // ISO timestamp
  service?: string                      // Service name
  data?: Record<string, unknown>        // Structured data
}
```

Usage:
```typescript
import { createLogger } from '@cku/observability'

const logger = createLogger({ service: 'control-service', minLevel: 'info' })
logger.info('Gate evaluated', { gate: 'security', decision: 'pass', confidence: 0.92 })
logger.error('Authorization failed', { userId: 'user-123', reason: 'expired-token' })
```

Logs are emitted as newline-delimited JSON:
- **stdout**: debug, info
- **stderr**: warn, error

---

## Instrumentation Patterns

### Recording a Governance Decision

```typescript
import { buildGovernanceTrace, saveGovernanceTrace } from '@cku/observability'

const trace = buildGovernanceTrace({
  runId: 'run-abc123',
  summary: 'Deploy to production',
  mode: 'prod',
  intent: {
    passed: true,
    score: 0.95,
    reason: 'Intent matches allowed deployment patterns',
    matchedSignals: ['deploy', 'prod', 'automated']
  },
  constraints: {
    passed: true,
    violations: [],
    appliedPolicies: ['require-approval', 'audit-trail']
  },
  validation: {
    passed: true,
    errors: []
  },
  consensus: {
    passed: true,
    votes: [
      { agent: 'security-agent', decision: 'approve', weight: 1.5, reason: 'Risk OK' },
      { agent: 'human-reviewer', decision: 'approve', weight: 1.0, reason: 'Approved' }
    ],
    approvalWeight: 2.5,
    rejectionWeight: 0,
    threshold: 0.6,
    reason: 'Consensus reached'
  }
})

// Final trace includes computed confidence and decision
console.log(trace.finalDecision) // 'execute'
console.log(trace.confidence.score) // e.g. 0.92

// Save for audit
const filePath = saveGovernanceTrace(trace)
console.log(`Saved to ${filePath}`)
```

### Logging Structured Events

```typescript
import { createLogger } from '@cku/observability'

const logger = createLogger({ service: 'orchestrator' })

// Gate evaluation
logger.info('Gate evaluation started', {
  runId: 'run-123',
  gateName: 'security',
  tenantId: 'tenant-acme'
})

// Step execution
logger.info('Step executed', {
  runId: 'run-123',
  stepId: 'step-1',
  duration_ms: 250,
  result: 'success',
  output: { deployed_services: 3 }
})

// Error with context
logger.error('Step failed', {
  runId: 'run-123',
  stepId: 'step-1',
  error: 'Timeout waiting for health check',
  duration_ms: 30000,
  recovery: 'scheduled-retry'
})
```

### Recording Timeline Events

```typescript
import { TimelineEvent } from '@cku/observability'

const events: TimelineEvent[] = [
  {
    id: 'evt-1',
    runId: 'run-123',
    at: '2026-04-26T14:00:00Z',
    phase: 'intent-parse',
    event: 'intent-parsed',
    detail: 'Intent: Deploy to production',
    level: 'info'
  },
  {
    id: 'evt-2',
    runId: 'run-123',
    at: '2026-04-26T14:00:01Z',
    phase: 'constraint-check',
    event: 'constraints-evaluated',
    detail: 'All constraints passed',
    level: 'info',
    metadata: { policies_applied: 3 }
  },
  {
    id: 'evt-3',
    runId: 'run-123',
    at: '2026-04-26T14:00:05Z',
    phase: 'consensus',
    event: 'votes-collected',
    detail: 'Consensus threshold met',
    level: 'info',
    metadata: { approval_weight: 2.5, threshold: 0.6 }
  }
]

// Save timeline
const filePath = saveTimeline('run-123', events)
console.log(`Timeline saved to ${filePath}`)

// Load for audit
const loaded = loadLatestTimeline('run-123')
console.log(`Loaded ${loaded?.length || 0} events`)
```

---

## Storage Paths

Traces, timelines, and reports are stored in local `.ck/` directory:

```
.ck/
├── traces/            # Governance traces (JSON)
│   ├── run-123-20260426-140000.json
│   └── run-456-20260426-141500.json
├── timelines/         # Timeline events (JSON)
│   ├── run-123-20260426-140000.json
│   └── run-456-20260426-141500.json
└── reports/           # Markdown reports
    ├── run-123-20260426-140000.md
    └── run-456-20260426-141500.md
```

Functions:
- `saveGovernanceTrace(trace)` — Save trace, return file path
- `saveTimeline(runId, events)` — Save timeline, return file path
- `saveMarkdownReport(runId, markdown)` — Save report, return file path
- `loadLatestGovernanceTrace(runId)` — Load most recent trace for runId
- `loadLatestTimeline(runId)` — Load most recent timeline for runId

---

## Confidence Scoring

Confidence is computed as a **weighted average** of components:

```
confidence = Σ(component.score × component.weight) / Σ(component.weight)
```

Clamped to [0.0, 1.0] range.

**Decision logic:**
- If constraints **not passed** → decision = **blocked**
- If validation **not passed** → decision = **blocked**
- If confidence < threshold → decision = **blocked**
- Otherwise → decision = **execute**

**Example:**
```typescript
const components: ConfidenceComponent[] = [
  { key: 'intent', label: 'Intent', score: 0.95, weight: 0.25 },
  { key: 'constraint', label: 'Constraint', score: 1.0, weight: 0.30 },
  { key: 'validation', label: 'Validation', score: 0.95, weight: 0.20 },
  { key: 'consensus', label: 'Consensus', score: 0.85, weight: 0.25 }
]

confidence = (0.95*0.25 + 1.0*0.30 + 0.95*0.20 + 0.85*0.25) / 1.0
           = 0.9275

// Rounded to 3 decimals: 0.928
```

---

## Report Rendering

Generate human-readable markdown for decision audit:

```typescript
import { renderScoreExplanation } from '@cku/observability'

const trace = buildGovernanceTrace(input)
const explanation = renderScoreExplanation(trace)
console.log(explanation)

// Output:
// Confidence: 0.92
// Threshold: 0.7
//
// Breakdown:
// - Intent Alignment: score=0.9 weight=0.25
//   note: Intent matches allowed deployment patterns
// - Constraint Compliance: score=1 weight=0.3
// - Validation Integrity: score=0.95 weight=0.2
// - Consensus Strength: score=0.85 weight=0.25
//
// Confidence 0.92 meets threshold 0.7.
```

---

## Testing

### Unit Tests

Test confidence calculation:
```typescript
import { deriveConfidenceTrace } from '@cku/observability'
import { describe, it, expect } from 'vitest'

describe('deriveConfidenceTrace', () => {
  it('should compute weighted average', () => {
    const components = [
      { key: 'a', label: 'A', score: 0.5, weight: 0.5 },
      { key: 'b', label: 'B', score: 1.0, weight: 0.5 }
    ]
    const trace = deriveConfidenceTrace(components, 0.7)
    expect(trace.score).toBe(0.75)
  })

  it('should clamp score to [0, 1]', () => {
    const components = [
      { key: 'a', label: 'A', score: 1.5, weight: 1 }
    ]
    const trace = deriveConfidenceTrace(components)
    expect(trace.score).toBe(1.0)
  })

  it('should respect threshold', () => {
    const components = [
      { key: 'a', label: 'A', score: 0.5, weight: 1 }
    ]
    const trace = deriveConfidenceTrace(components, 0.7)
    expect(trace.reason).toContain('below threshold')
  })
})
```

### Integration Tests

Test end-to-end trace generation:
```typescript
describe('buildGovernanceTrace', () => {
  it('should build complete trace with final decision', () => {
    const trace = buildGovernanceTrace({
      runId: 'run-123',
      summary: 'Test execution',
      intent: { passed: true, score: 0.9, reason: 'OK' },
      constraints: { passed: true, violations: [] },
      validation: { passed: true, errors: [] },
      consensus: {
        passed: true,
        votes: [],
        approvalWeight: 1,
        rejectionWeight: 0,
        threshold: 0.5,
        reason: 'OK'
      }
    })

    expect(trace.finalDecision).toBe('execute')
    expect(trace.confidence.score).toBeGreaterThan(0)
  })

  it('should block if constraints fail', () => {
    const trace = buildGovernanceTrace({
      runId: 'run-123',
      summary: 'Test',
      intent: { passed: true, score: 0.9, reason: 'OK' },
      constraints: { passed: false, violations: ['Policy violated'] },
      validation: { passed: true, errors: [] },
      consensus: {
        passed: true,
        votes: [],
        approvalWeight: 1,
        rejectionWeight: 0,
        threshold: 0.5,
        reason: 'OK'
      }
    })

    expect(trace.finalDecision).toBe('blocked')
  })
})
```

### Trace Storage Tests

Test persistence:
```typescript
import { saveGovernanceTrace, loadLatestGovernanceTrace } from '@cku/observability'
import fs from 'node:fs'

describe('Trace Store', () => {
  afterEach(() => {
    // Clean up test files
    if (fs.existsSync('.ck/traces')) {
      fs.rmSync('.ck/traces', { recursive: true })
    }
  })

  it('should save and load governance trace', () => {
    const trace = buildGovernanceTrace({ /* ... */ })
    const filePath = saveGovernanceTrace(trace)

    expect(fs.existsSync(filePath)).toBe(true)

    const loaded = loadLatestGovernanceTrace(trace.runId)
    expect(loaded?.runId).toBe(trace.runId)
    expect(loaded?.finalDecision).toBe('execute')
  })
})
```

---

## Gotchas

### 1. **Floating-Point Rounding**
Confidence scores are rounded to 3 decimals. Always use rounded values for comparisons:

```typescript
// WRONG: Direct floating-point comparison
if (trace.confidence.score > 0.7) { /* ... */ }

// CORRECT: Already rounded in trace
if (trace.confidence.score > 0.7) { /* ... */ } // trace.confidence.score is rounded to 3 decimals
```

### 2. **Weight Normalization**
Component weights are NOT automatically normalized. The engine divides by sum of weights:

```typescript
// If weights don't sum to 1.0, they're normalized automatically:
const components = [
  { key: 'a', label: 'A', score: 0.8, weight: 2 },  // 2/4 = 50%
  { key: 'b', label: 'B', score: 0.6, weight: 2 }   // 2/4 = 50%
]
// Result: (0.8 * 0.5) + (0.6 * 0.5) = 0.7
```

### 3. **Final Decision is Immutable**
Once a trace is built, the final decision cannot change. Always provide accurate inputs:

```typescript
// WRONG: Building trace multiple times to change decision
let trace = buildGovernanceTrace(input)
if (trace.finalDecision === 'blocked') {
  input.constraints.passed = true
  trace = buildGovernanceTrace(input)  // Don't do this
}

// CORRECT: Build once with correct inputs
const trace = buildGovernanceTrace(input)
```

### 4. **Storage Directory Creation**
Trace store auto-creates `.ck/` directories if missing, but ensure write permissions:

```typescript
// Permission check (manual):
import { saveGovernanceTrace } from '@cku/observability'

try {
  const path = saveGovernanceTrace(trace)
  console.log(`Saved to ${path}`)
} catch (error) {
  console.error('Cannot write trace (permission denied?)', error)
}
```

### 5. **Latest File Sorting**
Timeline and trace files are identified by `runId-timestamp` naming. Latest file is determined by reverse alphabetical sort:

```
run-123-20260426-140000.json  (loaded)
run-123-20260426-141500.json  (loaded as latest)

// Timestamp format is slugified: YYYYMMDD-HHMMSS
```

If system clocks are misaligned, older files may be returned. Ensure correct system time.

### 6. **JSON Stringification**
Traces with circular references cannot be serialized. All nested objects must be JSON-serializable:

```typescript
// WRONG: Functions in trace
const trace = buildGovernanceTrace({
  // ...
  consensus: {
    votes: [
      {
        agent: 'security',
        decision: 'approve',
        weight: 1.5,
        reason: 'OK',
        checkFn: () => { /* ... */ }  // Cannot serialize functions!
      }
    ]
    // ...
  }
})

// CORRECT: Use primitive types only
const trace = buildGovernanceTrace({
  // ...
  consensus: {
    votes: [
      {
        agent: 'security',
        decision: 'approve',
        weight: 1.5,
        reason: 'OK'  // String only
      }
    ]
    // ...
  }
})
```

---

## Cross-References

**Depends on:**
- [packages/shared/CLAUDE.md](../shared/CLAUDE.md) — Observability types (`GovernanceTrace`, `TimelineEvent`, etc.)
- [packages/governance/CLAUDE.md](../governance/CLAUDE.md) — Uses governance traces for decision recording
- [packages/audit/CLAUDE.md](../audit/CLAUDE.md) — Complements audit trail with human-readable traces

**Used by:**
- [apps/control-service/CLAUDE.md](../../apps/control-service/CLAUDE.md) — Records governance decisions
- [packages/orchestrator/CLAUDE.md](../orchestrator/CLAUDE.md) — Records execution timelines

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo overview
- [System Architecture](../../docs/ARCHITECTURE.md) — System layers and data flow
- [Testing Guide](../../docs/TESTING.md) — Observability test patterns
