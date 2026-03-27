-- Migration: 005_outcomes.sql
-- Description: Create outcomes table for Phase 10 self-learning.

CREATE TABLE IF NOT EXISTS outcomes (
    outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    org_id TEXT,
    workspace_id TEXT,
    project_id TEXT,
    actor_id TEXT,
    status TEXT NOT NULL,
    quality_score FLOAT DEFAULT 1.0,
    retry_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    failure_types TEXT[],
    verification_status TEXT,
    operator_rating INTEGER,
    operator_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggested indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_run_id ON outcomes(run_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_project_id_created ON outcomes(project_id, created_at DESC);
