-- db/seeds/roles-and-permissions.sql
-- Default permissions for Core roles in Code Kit Ultra

-- Seed initial basic permissions
insert into permissions (id, name, description) values
('run:create', 'Create Mission', 'Allow starting new execution missions'),
('run:read', 'View Mission status', 'Allow monitoring progress'),
('run:approve', 'Approve Gates', 'Allow advancing across manual checkpoints'),
('run:cancel', 'Stop Mission', 'Allow forceful termination'),
('project:manage', 'Manage projects', 'Allow project-level configuration'),
('org:admin', 'Admin privileges', 'Full administrative access')
on conflict (id) do update set 
  name = excluded.name, 
  description = excluded.description;

-- Seed role-permission mapping
delete from role_permissions;
insert into role_permissions (role, permission_id) values
('owner', 'org:admin'),
('admin', 'project:manage'),
('admin', 'run:create'),
('admin', 'run:read'),
('admin', 'run:approve'),
('operator', 'run:create'),
('operator', 'run:read'),
('operator', 'run:approve'),
('reviewer', 'run:read'),
('reviewer', 'run:approve'),
('viewer', 'run:read'),
('service_account', 'run:create'),
('service_account', 'run:read');
