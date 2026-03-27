-- db/migrations/003_scope_existing_runs.sql
-- Wave 4: Patching operational tables with tenant and actor metadata
-- This migration ensures that all operational tables support multi-tenant scoping and audit trail context.

-- 1. Runs
create table if not exists runs (
  id text primary key,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text not null,
  mode text not null,
  status text not null check (status in ('planned','running','paused','completed','failed','cancelled','draft','queued','simulating','awaiting_approval','executing','verifying','succeeded','rolled_back')),
  idea text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Run Gates
create table if not exists run_gates (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  gate_type text not null,
  status text not null check (status in ('pending','approved','rejected','expired','bypassed','pass','fail','needs-review','blocked')),
  reason text,
  risk_level text,
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text,
  approved_by text, -- fallback for user-level name
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Run Events
create table if not exists run_events (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text not null,
  occurred_at timestamptz not null default now()
);

-- 4. Audit Logs
create table if not exists audit_logs (
  id text primary key,
  org_id text not null references organizations(id),
  workspace_id text references workspaces(id),
  project_id text references projects(id),
  run_id text references runs(id) on delete set null,
  actor_id text not null,
  actor_type text not null,
  auth_mode text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  created_at timestamptz not null default now()
);

-- 5. Healing Actions
create table if not exists healing_actions (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text,
  issue_description text,
  resolution text,
  status text not null,
  created_at timestamptz not null default now()
);

-- 6. Rollback Actions
create table if not exists rollback_actions (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text,
  target_run_id text,
  reason text,
  status text not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance and scoping
create index if not exists idx_runs_org_project_status on runs(org_id, project_id, status);
create index if not exists idx_audit_logs_org_created on audit_logs(org_id, created_at);
create index if not exists idx_run_events_run_id on run_events(run_id, occurred_at);
create index if not exists idx_run_gates_run_id on run_gates(run_id, created_at);
