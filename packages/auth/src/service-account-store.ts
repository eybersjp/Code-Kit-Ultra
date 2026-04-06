import { getPool } from '../../shared/src/db.js';
import { logger } from '../../shared/src/logger.js';

export interface ServiceAccount {
  id: string;
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  name: string;
  status: 'active' | 'revoked' | 'rotated';
  scopes: string[];
  secretHash: string;
  createdAt: Date;
}

export class ServiceAccountStore {
  static async createServiceAccount(sa: Omit<ServiceAccount, 'createdAt'>): Promise<void> {
    const pool = getPool();
    const query = `
      INSERT INTO service_accounts (
        id, org_id, workspace_id, project_id, name, status, scopes, secret_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await pool.query(query, [
        sa.id,
        sa.orgId,
        sa.workspaceId || null,
        sa.projectId || null,
        sa.name,
        sa.status,
        JSON.stringify(sa.scopes),
        sa.secretHash,
      ]);
    } catch (err) {
      logger.error(
        { err, saId: sa.id, orgId: sa.orgId },
        'Failed to create service account'
      );
      throw err;
    }
  }

  static async getServiceAccount(
    id: string,
    orgId: string
  ): Promise<ServiceAccount | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM service_accounts
      WHERE id = $1 AND org_id = $2
    `;

    try {
      const result = await pool.query(query, [id, orgId]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        name: row.name,
        status: row.status,
        scopes: JSON.parse(row.scopes),
        secretHash: row.secret_hash,
        createdAt: row.created_at,
      };
    } catch (err) {
      logger.error(
        { err, saId: id, orgId },
        'Failed to get service account'
      );
      throw err;
    }
  }

  static async listServiceAccounts(orgId: string): Promise<ServiceAccount[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM service_accounts
      WHERE org_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [orgId]);
      return result.rows.map((row: any) => ({
        id: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        name: row.name,
        status: row.status,
        scopes: JSON.parse(row.scopes),
        secretHash: row.secret_hash,
        createdAt: row.created_at,
      }));
    } catch (err) {
      logger.error({ err, orgId }, 'Failed to list service accounts');
      throw err;
    }
  }

  static async rotateSecret(id: string, newSecretHash: string): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE service_accounts
      SET secret_hash = $1, status = 'rotated', updated_at = NOW()
      WHERE id = $2
    `;

    try {
      await pool.query(query, [newSecretHash, id]);
    } catch (err) {
      logger.error(
        { err, saId: id },
        'Failed to rotate service account secret'
      );
      throw err;
    }
  }

  static async revokeServiceAccount(id: string): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE service_accounts
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await pool.query(query, [id]);
    } catch (err) {
      logger.error({ err, saId: id }, 'Failed to revoke service account');
      throw err;
    }
  }
}
