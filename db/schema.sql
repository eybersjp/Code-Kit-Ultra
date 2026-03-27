-- db/schema.sql
-- Code Kit Ultra - InsForge-first source-of-truth schema
-- This schema represents the consolidated state after initial setup and migrations 001-003.

--------------------------------------------------------------------------------
-- 1. Tenant & Actor Foundation
--------------------------------------------------------------------------------

create table if not exists organizations (
  id text primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspaces (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists projects (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists users (
  id text primary key,
  insforge_user_id text unique not null,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','reviewer','viewer','service_account')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists project_memberships (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','reviewer','viewer','service_account')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists permissions (
  id text primary key,
  name text unique not null,
  description text
);

create table if not exists role_permissions (
  role text not null,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role, permission_id)
);

--------------------------------------------------------------------------------
-- 2. Service & Identity
--------------------------------------------------------------------------------

create table if not exists service_accounts (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  workspace_id text references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- 3. Operational Logic & Execution Monitoring
--------------------------------------------------------------------------------

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
  status text not null,
  idea text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists run_gates (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  org_id text not null references organizations(id),
  workspace_id text not null references workspaces(id),
  project_id text not null references projects(id),
  gate_type text not null,
  status text not null,
  reason text,
  risk_level text,
  actor_id text,
  actor_type text,
  auth_mode text,
  correlation_id text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

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

--------------------------------------------------------------------------------
-- 4. Indexes
--------------------------------------------------------------------------------

create index if not exists idx_runs_org_project_status on runs(org_id, project_id, status);
create index if not exists idx_audit_logs_org_created on audit_logs(org_id, created_at);
create index if not exists idx_run_events_run_id on run_events(run_id, occurred_at);
create index if not exists idx_run_gates_run_id on run_gates(run_id, created_at);
