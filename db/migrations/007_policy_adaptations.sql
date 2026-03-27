-- Migration: 007_policy_adaptations.sql
-- Description: Create policy_adaptations table for Phase 10 adaptive control.

CREATE TABLE IF NOT EXISTS policy_adaptations (
    adaptation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    task_id TEXT,
    scope_type TEXT NOT NULL, -- run/task/adapter
    scope_ref TEXT,
    action_type TEXT NOT NULL, -- timeout_boost/adapter_swap/retry_increase/etc
    original_value JSONB,
    adapted_value JSONB,
    reason TEXT,
    status TEXT DEFAULT 'applied', -- applied/reverted/monitored
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggested indexes
CREATE INDEX IF NOT EXISTS idx_adaptations_run ON policy_adaptations(run_id);
CREATE INDEX IF NOT EXISTS idx_adaptations_scope ON policy_adaptations(scope_type, scope_ref);
