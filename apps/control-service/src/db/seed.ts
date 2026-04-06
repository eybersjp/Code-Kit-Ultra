import { getPool } from './pool.js';
import { logger } from '../lib/logger.js';

export async function seedDatabase(): Promise<void> {
  const pool = getPool();

  try {
    logger.info('Starting database seeding');

    // Create default organization
    await pool.query(`
      INSERT INTO organizations (id, slug, name)
      VALUES ('org-default', 'default-org', 'Default Organization')
      ON CONFLICT DO NOTHING
    `);

    // Create workspaces
    await pool.query(`
      INSERT INTO workspaces (id, org_id, slug, name)
      VALUES
        ('ws-dev', 'org-default', 'dev', 'Development'),
        ('ws-staging', 'org-default', 'staging', 'Staging')
      ON CONFLICT DO NOTHING
    `);

    // Create projects
    await pool.query(`
      INSERT INTO projects (id, org_id, workspace_id, slug, name, description)
      VALUES
        ('proj-api', 'org-default', 'ws-dev', 'api', 'API Backend', 'Main API service'),
        ('proj-web', 'org-default', 'ws-dev', 'web', 'Web Frontend', 'React web application'),
        ('proj-staging-api', 'org-default', 'ws-staging', 'api', 'API Staging', 'Staging API'),
        ('proj-shared', 'org-default', 'ws-dev', 'shared', 'Shared Libs', 'Shared libraries'),
        ('proj-tools', 'org-default', 'ws-staging', 'tools', 'Tooling', 'Build and test tools')
      ON CONFLICT DO NOTHING
    `);

    // Create users
    await pool.query(`
      INSERT INTO users (id, insforge_user_id, email, display_name)
      VALUES
        ('user-admin', 'insforge-admin-1', 'admin@example.com', 'Admin User'),
        ('user-op', 'insforge-op-1', 'operator@example.com', 'Operator User'),
        ('user-reviewer', 'insforge-reviewer-1', 'reviewer@example.com', 'Reviewer User'),
        ('user-viewer', 'insforge-viewer-1', 'viewer@example.com', 'Viewer User'),
        ('user-dev1', 'insforge-dev-1', 'dev1@example.com', 'Developer 1'),
        ('user-dev2', 'insforge-dev-2', 'dev2@example.com', 'Developer 2')
      ON CONFLICT DO NOTHING
    `);

    // Create organization memberships
    await pool.query(`
      INSERT INTO organization_memberships (id, org_id, user_id, role)
      VALUES
        ('om-admin', 'org-default', 'user-admin', 'admin'),
        ('om-op', 'org-default', 'user-op', 'operator'),
        ('om-reviewer', 'org-default', 'user-reviewer', 'reviewer'),
        ('om-viewer', 'org-default', 'user-viewer', 'viewer'),
        ('om-dev1', 'org-default', 'user-dev1', 'operator'),
        ('om-dev2', 'org-default', 'user-dev2', 'operator')
      ON CONFLICT DO NOTHING
    `);

    // Create project memberships
    await pool.query(`
      INSERT INTO project_memberships (id, project_id, user_id, role)
      VALUES
        ('pm-admin-api', 'proj-api', 'user-admin', 'admin'),
        ('pm-op-api', 'proj-api', 'user-op', 'operator'),
        ('pm-rev-api', 'proj-api', 'user-reviewer', 'reviewer'),
        ('pm-dev1-api', 'proj-api', 'user-dev1', 'operator'),
        ('pm-op-web', 'proj-web', 'user-op', 'operator'),
        ('pm-rev-web', 'proj-web', 'user-reviewer', 'reviewer'),
        ('pm-dev2-web', 'proj-web', 'user-dev2', 'operator')
      ON CONFLICT DO NOTHING
    `);

    // Create some pre-seeded runs
    await pool.query(`
      INSERT INTO runs (id, org_id, workspace_id, project_id, mode, status, idea, created_by)
      VALUES
        ('run-1', 'org-default', 'ws-dev', 'proj-api', 'balanced', 'completed', 'Fix login bug', 'user-dev1'),
        ('run-2', 'org-default', 'ws-dev', 'proj-web', 'safe', 'running', 'Update homepage design', 'user-dev2'),
        ('run-3', 'org-default', 'ws-staging', 'proj-staging-api', 'turbo', 'paused', 'Deploy to staging', 'user-op'),
        ('run-4', 'org-default', 'ws-dev', 'proj-api', 'expert', 'failed', 'Complex refactor', 'user-dev1'),
        ('run-5', 'org-default', 'ws-dev', 'proj-shared', 'balanced', 'planned', 'Update dependencies', 'user-dev2')
      ON CONFLICT DO NOTHING
    `);

    // Create run metadata
    await pool.query(`
      INSERT INTO runs_metadata (run_id, current_step, data)
      VALUES
        ('run-1', 8, '{}'),
        ('run-2', 4, '{}'),
        ('run-3', 5, '{}'),
        ('run-4', 6, '{}'),
        ('run-5', 0, '{}')
      ON CONFLICT DO NOTHING
    `);

    logger.info('Database seeding completed successfully');
  } catch (err) {
    logger.error({ err }, 'Database seeding failed');
    throw err;
  }
}
