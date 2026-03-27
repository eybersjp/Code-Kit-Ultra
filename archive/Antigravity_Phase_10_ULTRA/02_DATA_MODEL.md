# Phase 10 Data Model

## New tables / collections

### outcomes
- outcome_id
- run_id
- org_id
- workspace_id
- project_id
- actor_id
- status
- quality_score
- retry_count
- duration_ms
- failure_count
- failure_types[]
- verification_status
- operator_rating
- operator_comment
- created_at

### learning_patterns
- pattern_id
- org_id
- scope_type (global/org/project/adapter/task)
- scope_ref
- signature
- observed_count
- success_count
- failure_count
- avg_duration_ms
- mean_quality_score
- recommended_fix
- confidence
- last_seen_at
- created_at
- updated_at

### adapter_reliability
- adapter_id
- org_id
- task_type
- success_rate
- mean_retry_count
- mean_duration_ms
- reliability_score
- confidence
- updated_at

### policy_adaptations
- adaptation_id
- org_id
- policy_area
- prior_value
- proposed_value
- reason
- confidence
- source_pattern_ids[]
- status (proposed/approved/rejected/applied/reverted)
- approved_by
- applied_at
- created_at

### optimization_decisions
- decision_id
- run_id
- plan_step_id
- original_strategy
- optimized_strategy
- reason
- confidence
- outcome
- created_at

## Suggested indexes
- outcomes(run_id)
- outcomes(project_id, created_at desc)
- learning_patterns(scope_type, scope_ref, signature)
- adapter_reliability(org_id, adapter_id, task_type)
- policy_adaptations(org_id, status, created_at desc)
