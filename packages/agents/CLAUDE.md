# Agents Package — Agent Profiles & Consensus Weights

## Quick Overview

The **agents** package defines agent profiles and adaptive consensus policies that power governance voting. Each agent (planner, builder, reviewer, security) has:

- **Weight** — Influence in consensus decisions (1.0–1.2 typical)
- **Reliability** — Historical success rate (0.82–0.92)
- **Veto Authority** — Can block high-risk actions (reviewer, security only)
- **Adaptive Policy** — Risk-based thresholds for approval (low/medium/high)

**Usage:** Governance gates use these profiles to weight agent votes and apply veto rules when high-risk actions are proposed.

---

## Agent Types & Profiles

### Default Agent Profiles

| Agent | Weight | Reliability | Veto | Purpose |
|-------|--------|-------------|------|---------|
| **planner** | 1.0 | 0.82 | No | Plans execution strategy, identifies risks |
| **builder** | 1.0 | 0.84 | No | Implements changes, validates buildability |
| **reviewer** | 1.1 | 0.88 | Yes | Code review, quality gates, medium+ risk veto |
| **security** | 1.2 | 0.92 | Yes | Security audit, high-risk veto authority |

### Profile Structure

```typescript
interface AgentProfile {
  agent: string                  // Agent identifier (e.g., 'security')
  baseWeight: number             // Voting weight in consensus (1.0–1.5)
  reliability: number            // Success rate (0.0–1.0)
  canVeto: boolean               // Can block risky actions
  totalRuns: number              // Lifetime execution count
  successes: number              // Successful evaluations
  failures: number               // Failed evaluations
  lastUpdatedAt: string          // ISO timestamp of last reliability update
}
```

### Profile Retrieval

```typescript
import { getDefaultAgentProfiles, getDefaultAdaptivePolicy } from '@cku/agents'

const profiles = getDefaultAgentProfiles()
// Returns: [planner, builder, reviewer, security]

const policy = getDefaultAdaptivePolicy()
// Returns: risk-based consensus thresholds
```

---

## Adaptive Consensus Policy

The policy drives gate approval thresholds based on risk level.

### Policy Structure

```typescript
interface AdaptiveConsensusPolicy {
  thresholdLowRisk: number       // Approval needed at low risk (0.55 = 55%)
  thresholdMediumRisk: number    // Approval needed at medium risk (0.65 = 65%)
  thresholdHighRisk: number      // Approval needed at high risk (0.75 = 75%)
  reviewerVetoAtRisk: string[]   // Reviewer veto triggers ['medium', 'high']
  securityVetoAtRisk: string[]   // Security veto triggers ['high']
  reliabilityInfluence: number   // Weight of reliability in scoring (0.35 = 35%)
  confidenceInfluence: number    // Weight of confidence in scoring (0.65 = 65%)
}
```

### Default Policy

```typescript
const DEFAULT_ADAPTIVE_POLICY: AdaptiveConsensusPolicy = {
  thresholdLowRisk: 0.55,         // Planner + Builder (1.0 + 1.0 = 2.0, need >1.1)
  thresholdMediumRisk: 0.65,      // Need Planner + Reviewer (1.0 + 1.1 = 2.1, need >1.3)
  thresholdHighRisk: 0.75,        // Need Reviewer + Security (1.1 + 1.2 = 2.3, need >1.7)
  reviewerVetoAtRisk: ['medium', 'high'],
  securityVetoAtRisk: ['high'],
  reliabilityInfluence: 0.35,
  confidenceInfluence: 0.65,
};
```

### Voting Example

**Scenario:** Deploy to production (high-risk action)

1. **Planner** votes: "plan is sound" → weight 1.0, reliability 0.82
2. **Builder** votes: "builds successfully" → weight 1.0, reliability 0.84
3. **Reviewer** votes: "code quality approved" → weight 1.1, reliability 0.88, CAN VETO
4. **Security** votes: "security audit passed" → weight 1.2, reliability 0.92, CAN VETO

**Calculation (high-risk):**
- Weighted score: (1.0 × 0.82) + (1.0 × 0.84) + (1.1 × 0.88) + (1.2 × 0.92)
  = 0.82 + 0.84 + 0.968 + 1.104 = 3.732
- Total weight: 1.0 + 1.0 + 1.1 + 1.2 = 4.4
- Consensus: 3.732 / 4.4 = **0.848 (84.8%)**
- Threshold: 0.75 (high-risk) → **PASS** (if no vetoes)
- Vetoes: If security votes "block", action is **BLOCKED** regardless of consensus score

---

## Consensus Integration with Governance

### How Gates Use Agent Profiles

Governance gates evaluate agent responses and vote using profiles:

```typescript
// Example: SecurityGate evaluation
async evaluate(context: GateEvaluationContext): Promise<GateResult> {
  const securityAgent = agentProfiles.find(a => a.agent === 'security')
  const decision = await runSecurityAudit(context)
  
  if (decision.riskLevel === 'high' && !securityAgent.canVeto) {
    // Security must have veto authority for high-risk
    return { severity: 'blocked', reason: 'Security veto required' }
  }
  
  return { severity: decision.severity, weight: securityAgent.baseWeight }
}
```

### Consensus Vote Count

Gates aggregate all agent votes:

```typescript
function calculateConsensus(votes: GateVote[], policy: AdaptiveConsensusPolicy): Decision {
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0)
  const weightedScore = votes.reduce(
    (sum, v) => sum + (v.weight * v.agent.reliability),
    0
  )
  const consensus = weightedScore / totalWeight
  
  const riskLevel = evaluateRisk(context)
  const threshold = policy[`threshold${riskLevel}`]
  
  if (consensus >= threshold) return 'APPROVE'
  return 'NEEDS_REVIEW'
}
```

---

## Customization & Extension

### Adding a New Agent

1. **Define profile in profiles.ts:**

```typescript
export const DEFAULT_AGENT_PROFILES: Record<string, AgentProfile> = {
  // ... existing agents ...
  learning: {
    agent: 'learning',
    baseWeight: 1.0,
    reliability: 0.85,
    canVeto: false,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  }
}
```

2. **Create corresponding gate** in governance package (e.g., LearningGate)

3. **Update policy thresholds** if new agent changes consensus math

### Tuning Weights

- **Increase `baseWeight`** for more influential agents
- **Decrease** for advisory-only agents
- **Weights should sum to ~4.0–4.5** for balanced consensus

### Adjusting Reliability

Reliability updates automatically via learning package:

```typescript
// After gate evaluation, learning updates reliability
profile.reliability = (successes / totalRuns)
profile.lastUpdatedAt = new Date().toISOString()
```

---

## Testing

### Unit Tests

```typescript
import { getDefaultAgentProfiles, getDefaultAdaptivePolicy } from '@cku/agents'

describe('Agent Profiles', () => {
  it('loads default profiles', () => {
    const profiles = getDefaultAgentProfiles()
    expect(profiles).toHaveLength(4)
    expect(profiles[0].agent).toBe('planner')
  })

  it('applies veto rules for security', () => {
    const security = getDefaultAgentProfiles().find(p => p.agent === 'security')
    expect(security?.canVeto).toBe(true)
  })

  it('calculates consensus threshold', () => {
    const policy = getDefaultAdaptivePolicy()
    expect(policy.thresholdHighRisk).toBe(0.75)
  })
})
```

### Integration Tests

```typescript
describe('Consensus Voting', () => {
  it('blocks high-risk action when security vetoes', async () => {
    const context = { riskLevel: 'high' }
    const votes = [
      { agent: 'reviewer', vote: 'approve', weight: 1.1 },
      { agent: 'security', vote: 'block', weight: 1.2 },
    ]
    
    const decision = calculateConsensus(votes, context)
    expect(decision).toBe('BLOCKED')
  })

  it('approves medium-risk with reviewer consensus', async () => {
    const context = { riskLevel: 'medium' }
    const votes = [
      { agent: 'planner', vote: 'approve', weight: 1.0, reliability: 0.82 },
      { agent: 'reviewer', vote: 'approve', weight: 1.1, reliability: 0.88 },
    ]
    
    const consensus = (1.0 * 0.82 + 1.1 * 0.88) / 2.1 // 0.85
    expect(consensus).toBeGreaterThan(0.65) // medium threshold
  })
})
```

---

## Gotchas

### Weight Normalization

Weights are NOT automatically normalized. If you add agents, update total weight calculation:

```typescript
// WRONG: assumes 4 agents
const consensus = totalWeightedVotes / 4.4

// CORRECT: compute dynamic total
const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0)
const consensus = totalWeightedVotes / totalWeight
```

### Veto Loop Prevention

Security or reviewer veto can block execution indefinitely. **Mitigation:**
- Track veto frequency per agent
- Escalate to human review after 2+ consecutive vetoes
- Implement timeout-based auto-approval (not recommended for prod)

### Missing Agent Profiles

If a new gate references an undefined agent, consensus calculation fails silently:

```typescript
// WRONG: references 'healing' agent that doesn't exist
const healingProfile = profiles.find(p => p.agent === 'healing')
const weight = healingProfile?.baseWeight // undefined!

// CORRECT: validate profile exists
const healingProfile = profiles.find(p => p.agent === 'healing')
if (!healingProfile) throw new Error('Agent "healing" not registered')
```

### Stale Reliability Scores

Reliability updates only when outcomes are analyzed (learning package). During initial onboarding:
- Assume 0.70 reliability for new agents
- Update thresholds after 10+ successful evaluations
- Avoid critical decisions with unproven agents

---

## Cross-References

**Depends on:**
- [shared](../shared/CLAUDE.md) — governance-types (AgentProfile, AdaptiveConsensusPolicy)

**Used by:**
- [governance](../governance/CLAUDE.md) — gates use agent profiles for voting
- [control-service](../../apps/control-service/CLAUDE.md) — injects agent profiles into gate evaluation context

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md)
- [System Architecture](../../docs/ARCHITECTURE.md)
- [Config Schema](../../docs/CONFIG_SCHEMA.md)
