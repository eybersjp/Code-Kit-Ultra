-- db/migrations/002_service_accounts.sql
-- Wave 4: Integration of service accounts for non-user actors

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
