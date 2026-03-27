-- db/migrations/001_insforge_tenant_foundation.sql
-- Wave 4: Foundation for Organizations, Workspaces, and Projects

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
