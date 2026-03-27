-- Migration: 008_optimization_decisions.sql
-- Description: Create optimization_decisions table for Phase 10 pre-execution optimization.

CREATE TABLE IF NOT EXISTS optimization_decisions (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    task_id TEXT,
    original_plan JSONB,
    optimized_plan JSONB,
    impact_estimate FLOAT, -- expected duration reduction or reliability boost
    status TEXT DEFAULT 'applied',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggested index
CREATE INDEX IF NOT EXISTS idx_opt_run ON optimization_decisions(run_id);
