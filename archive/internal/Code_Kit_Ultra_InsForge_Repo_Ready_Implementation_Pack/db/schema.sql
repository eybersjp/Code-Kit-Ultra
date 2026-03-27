-- Code Kit Ultra - InsForge-first starter schema
-- Postgres starter intended for InsForge-managed database

create table if not exists organizations (
  id text primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspaces (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists projects (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
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
  organization_id text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','reviewer','viewer','service_account')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists project_memberships (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','operator','reviewer','viewer','service_account')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists policy_sets (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  policy_json jsonb not null default '{}'::jsonb,
  created_by text references users(id),
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  initiated_by text references users(id),
  mode text not null,
  status text not null check (status in ('draft','queued','simulating','awaiting_approval','executing','verifying','succeeded','failed','rolled_back','cancelled')),
  idea text,
  summary text,
  correlation_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists run_gates (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  gate_type text not null,
  status text not null check (status in ('pending','approved','rejected','expired','bypassed')),
  reason text,
  risk_level text,
  action_token_id text,
  approved_by text references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists run_events (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  actor_type text,
  actor_id text,
  occurred_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  run_id text references runs(id) on delete set null,
  actor_type text not null,
  actor_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  decision text,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists run_artifacts (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  storage_path text not null,
  content_type text,
  artifact_type text not null,
  created_by text references users(id),
  created_at timestamptz not null default now()
);

create table if not exists service_accounts (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  workspace_id text references workspaces(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_runs_project_status on runs(project_id, status);
create index if not exists idx_run_events_run_id on run_events(run_id, occurred_at);
create index if not exists idx_audit_logs_project_created on audit_logs(project_id, created_at);
create index if not exists idx_run_gates_run_id on run_gates(run_id, created_at);
