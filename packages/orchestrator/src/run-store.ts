import { getPool } from '../../shared/src/db.js';
import { logger } from '../../shared/src/logger.js';
import type { RunState } from '../../shared/src/types.js';

export class RunStore {
  static async createRun(runState: RunState): Promise<void> {
    const pool = getPool();
    const query = `
      INSERT INTO runs (
        id, org_id, workspace_id, project_id,
        status, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await pool.query(query, [
        runState.runId,
        runState.orgId ?? null,
        runState.workspaceId ?? null,
        runState.projectId ?? null,
        runState.status,
        runState.createdAt,
        runState.actorId ?? null,
      ]);

      // Insert metadata (current step index)
      await pool.query(
        'INSERT INTO runs_metadata (run_id, current_step, data) VALUES ($1, $2, $3) ON CONFLICT (run_id) DO NOTHING',
        [runState.runId, runState.currentStepIndex ?? 0, JSON.stringify(runState)]
      );
    } catch (err) {
      logger.error({ err, runId: runState.runId }, 'Failed to create run');
      throw err;
    }
  }

  static async getRun(runId: string): Promise<RunState | null> {
    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT * FROM runs WHERE id = $1',
        [runId]
      );
      if (result.rows.length === 0) return null;

      const metaResult = await pool.query(
        'SELECT current_step FROM runs_metadata WHERE run_id = $1',
        [runId]
      );

      const row = result.rows[0];
      return {
        runId: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        currentStepIndex: metaResult.rows[0]?.current_step ?? 0,
        approvalRequired: row.approval_required ?? false,
        approved: row.approved ?? false,
        actorId: row.created_by,
      };
    } catch (err) {
      logger.error({ err, runId }, 'Failed to get run');
      throw err;
    }
  }

  static async updateRunStatus(runId: string, status: string): Promise<void> {
    const pool = getPool();

    try {
      await pool.query(
        'UPDATE runs SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, runId]
      );
    } catch (err) {
      logger.error({ err, runId, status }, 'Failed to update run status');
      throw err;
    }
  }

  static async listRuns(projectId: string, orgId: string): Promise<RunState[]> {
    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT * FROM runs WHERE project_id = $1 AND org_id = $2 ORDER BY created_at DESC',
        [projectId, orgId]
      );

      return result.rows.map((row) => ({
        runId: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        currentStepIndex: 0,
        approvalRequired: row.approval_required ?? false,
        approved: row.approved ?? false,
        actorId: row.created_by,
      }));
    } catch (err) {
      logger.error({ err, projectId, orgId }, 'Failed to list runs');
      throw err;
    }
  }

  static async markState(runId: string, currentStepIndex: number): Promise<void> {
    const pool = getPool();

    try {
      await pool.query(
        'UPDATE runs_metadata SET current_step = $1, updated_at = NOW() WHERE run_id = $2',
        [currentStepIndex, runId]
      );
    } catch (err) {
      logger.error({ err, runId, currentStepIndex }, 'Failed to mark state');
      throw err;
    }
  }

  static async getCheckpointedStepIndex(runId: string): Promise<number> {
    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT current_step FROM runs_metadata WHERE run_id = $1',
        [runId]
      );
      return result.rows[0]?.current_step ?? 0;
    } catch (err) {
      logger.error({ err, runId }, 'Failed to get checkpoint');
      return 0;
    }
  }
}
