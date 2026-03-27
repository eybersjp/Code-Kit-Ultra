# Using the Phase 5 pack

## What this second pack is for
Phase 5 sits **on top of Phase 4**.

- Phase 4 gives you observability, traces, timeline, explainability, and reporting.
- Phase 5 changes how approvals are made by introducing specialist agents and adaptive voting.

That means the normal order is:

1. Install your current governed-autonomy repo.
2. Merge in the Phase 4 pack.
3. Merge in this Phase 5 pack.
4. Wire the adaptive consensus engine into the governed pipeline.
5. Run simulation commands first.
6. Only then enable it for real execution gating.

## Recommended integration path

### 1) Copy these folders into your repo
- `packages/agents`
- `packages/governance/src/adaptive-*`
- `packages/shared/src/agent-consensus.ts`
- `apps/cli/src/handlers/*`

### 2) Export the new handlers from your CLI
Register these commands in your existing `apps/cli/src/index.ts`:
- `/ck-vote`
- `/ck-consensus-adaptive`
- `/ck-agent-profile`
- `/ck-consensus-sim`

### 3) Replace the old consensus call
Wherever your governed pipeline currently calls the basic consensus engine, switch it to:

```ts
import { runAdaptiveConsensus } from "@code-kit/governance";
```

Then pass:
- run metadata
- risk level
- agent votes
- optional policy overrides
- optional historical agent stats

### 4) Start in simulation mode
First use this pack only for dry-runs:

```bash
npx codekit /ck-consensus-sim '{...}'
```

Compare the adaptive result against your old consensus result before enabling live gating.

### 5) Enable live gating
After validation, insert `runAdaptiveConsensus(...)` into the pre-execution pipeline.
Use the returned `finalDecision`, `shouldPause`, `vetoApplied`, and `explanation`.

## How to think about the specialist agents

### Planner Agent
Checks scope clarity, execution path, decomposition quality.

### Builder Agent
Checks implementation feasibility and mutation practicality.

### Reviewer Agent
Checks QA readiness, completeness, maintainability, regression risk.

### Security Agent
Checks policy safety, dangerous commands, data exposure risk, path safety.

## How adaptive consensus differs from weighted consensus
The older model likely did:
- fixed weights
- static pass threshold
- simple majority

The new model does:
- role-sensitive weights
- risk-sensitive thresholding
- reliability adjustments
- veto rules for reviewer/security
- confidence-aware scoring
- explanation output for observability

## Suggested rollout strategy

### Stage A — Observe only
Run the adaptive engine in parallel and log results to traces, but do not block execution yet.

### Stage B — Soft gate
If adaptive consensus says `needs-review`, pause only for medium/high risk batches.

### Stage C — Full gate
Make adaptive consensus authoritative for all governed mutations.

## Example real pipeline shape

```text
intent -> constraints -> validation -> specialist voting -> adaptive consensus -> confidence -> kill switch -> execute/block
```

## Best practices
- start with default agent profiles
- do not tune all weights at once
- keep reviewer/security veto enabled for medium/high risk
- log every explanation into Phase 4 traces
- review false positives for one sprint before hard-enforcing

## Minimum success test
You know this pack is integrated correctly when:
- the new CLI commands work
- a simulated consensus result returns explanation details
- Phase 4 traces include adaptive voting output
- medium/high risk runs pause appropriately
- reviewer/security veto can block risky batches
