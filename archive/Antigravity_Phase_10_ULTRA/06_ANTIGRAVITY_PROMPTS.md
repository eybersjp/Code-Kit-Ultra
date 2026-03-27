# Antigravity Execution Prompts

## Prompt A — Outcome Engine
Implement the outcome ingestion path for Code Kit Ultra.

Requirements:
- Add outcome contracts and storage
- Persist quality, retries, duration, failure types, verification status, and operator feedback
- Attach all records to org/workspace/project/run context
- Add POST /v1/outcomes
- Add tests
- Do not yet mutate policies automatically

Verification:
- Submit one synthetic outcome
- Confirm persistence
- Confirm audit entry
- Confirm typecheck passes

## Prompt B — Learning Store
Implement learning pattern aggregation from outcomes.

Requirements:
- Aggregate by adapter, task type, and failure signature
- Track counts, confidence, and recommended fix
- Expose read APIs
- Add pattern tests

Verification:
- Feed repeated synthetic outcomes
- Confirm pattern confidence rises
- Confirm recommended fix surfaces

## Prompt C — Reliability Scoring
Implement adapter and task reliability scoring.

Requirements:
- Compute success rate, retry penalty, duration penalty, and confidence
- Expose GET /v1/reliability
- Show scores in web control plane

Verification:
- Seed multiple outcomes
- Confirm score ordering is sensible
- Confirm display renders

## Prompt D — Adaptive Policy Proposals
Implement bounded policy adaptation proposals.

Requirements:
- Propose, not auto-apply, changes
- Require approval for any relaxation
- Persist full reasoning

Verification:
- Create adaptation proposal
- Approve/reject path works
- Audit trail complete

## Prompt E — Execution Optimizer
Implement optimization simulation.

Requirements:
- Evaluate original plan against reliability and pattern signals
- Produce optimized alternative with confidence and rationale
- No silent execution changes without preview in initial release

Verification:
- Simulate one run
- Produce optimization recommendations
- Preserve original plan if confidence low
