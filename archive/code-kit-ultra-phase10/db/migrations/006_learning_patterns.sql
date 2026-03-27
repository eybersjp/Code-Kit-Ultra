-- Migration: 006_learning_patterns.sql
-- Description: Create learning_patterns table for Phase 10 self-learning.

CREATE TABLE IF NOT EXISTS learning_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT,
    scope_type TEXT NOT NULL, -- global/org/project/adapter/task
    scope_ref TEXT,
    signature TEXT NOT NULL,
    observed_count INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_duration_ms FLOAT DEFAULT 0,
    mean_quality_score FLOAT DEFAULT 0,
    recommended_fix TEXT,
    confidence FLOAT DEFAULT 0.1,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggested index
CREATE INDEX IF NOT EXISTS idx_patterns_scope_sig ON learning_patterns(scope_type, scope_ref, signature);
