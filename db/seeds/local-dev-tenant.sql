-- db/seeds/local-dev-tenant.sql
-- Development-friendly tenant setup for local testing

-- 1. Organizations
insert into organizations (id, slug, name) values 
('org_dev_local', 'local-dev', 'Local Development Org')
on conflict (id) do nothing;

-- 2. Workspaces
insert into workspaces (id, org_id, slug, name) values 
('ws_main', 'org_dev_local', 'main', 'Main Development Workspace')
on conflict (id) do nothing;

-- 3. Projects
insert into projects (id, org_id, workspace_id, slug, name, description) values 
('proj_core', 'org_dev_local', 'ws_main', 'core-kit', 'Core Kit System', 'Target project for local autonomous execution testing')
on conflict (id) do nothing;

-- 4. Initial Users
insert into users (id, insforge_user_id, email, display_name) values 
('user_dev_1', 'insforge_dev_id_1', 'operator@codekit.local', 'Dev Operator One'),
('user_dev_admin', 'insforge_dev_id_admin', 'admin@codekit.local', 'Local Admin')
on conflict (id) do nothing;

-- 5. Memberships
insert into organization_memberships (id, org_id, user_id, role) values 
('mem_org_1', 'org_dev_local', 'user_dev_1', 'operator'),
('mem_org_admin', 'org_dev_local', 'user_dev_admin', 'owner')
on conflict (id) do nothing;

insert into project_memberships (id, project_id, user_id, role) values 
('mem_proj_1', 'proj_core', 'user_dev_1', 'operator'),
('mem_proj_admin', 'proj_core', 'user_dev_admin', 'owner')
on conflict (id) do nothing;

-- 6. Initial Service Account
insert into service_accounts (id, org_id, workspace_id, project_id, name, status, scopes) values 
('sa_agent_1', 'org_dev_local', 'ws_main', 'proj_core', 'CK-Agent-001', 'active', '["run:create", "run:read"]')
on conflict (id) do nothing;
