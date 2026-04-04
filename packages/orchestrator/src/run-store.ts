import { getPool } from '../../apps/control-service/src/db/pool.js';
import { RunState, StepState } from '../../packages/shared/src/types.js';
import { logger } from '../../apps/control-service/src/lib/logger.js';

export class RunStore {
  static async createRun(runState: RunState): Promise<void> {
    const pool = getPool();
    const query = `
      INSERT INTO runs (
        id, org_id, workspace_id, project_id,
        mode, status, idea, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await pool.query(query, [
        runState.id,
        runState.orgId,
        runState.workspaceId,
        runState.projectId,
        runState.mode,
        runState.status,
        runState.idea,
        runState.createdAt,
        runState.createdBy,
      ]);

      // Insert metadata (current step index)
      await pool.query(
        'INSERT INTO runs_metadata (run_id, current_step, data) VALUES ($1, $2, $3)',
        [runState.id, 0, JSON.stringify(runState)]
      );
    } catch (err) {
      logger.error({ err, runId: runState.id }, 'Failed to create run');
      throw err;
    }
  }

  static async getRun(id: string): Promise<RunState | null> {
    const pool = getPool();
    const query = `SELECT * FROM runs WHERE id = $1`;

    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        mode: row.mode,
        status: row.status,
        idea: row.idea,
        createdAt: row.created_at,
        createdBy: row.created_by,
      };
    } catch (err) {
      logger.error({ err, runId: id }, 'Failed to get run');
      throw err;
    }
  }

  static async updateRunStatus(
    id: string,
    status: string
  ): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE runs SET status = $1, updated_at = NOW() WHERE id = $2
    `;

    try {
      await pool.query(query, [status, id]);
    } catch (err) {
      logger.error({ err, runId: id, status }, 'Failed to update run status');
      throw err;
    }
  }

  static async listRuns(
    projectId: string,
    orgId: string
  ): Promise<RunState[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM runs
      WHERE project_id = $1 AND org_id = $2
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [projectId, orgId]);
      return result.rows.map((row) => ({
        id: row.id,
        orgId: row.org_id,
        workspaceId: row.workspace_id,
        projectId: row.project_id,
        mode: row.mode,
        status: row.status,
        idea: row.idea,
        createdAt: row.created_at,
        createdBy: row.created_by,
      }));
    } catch (err) {
      logger.error(
        { err, projectId, orgId },
        'Failed to list runs'
      );
      throw err;
    }
  }

  static async markState(runId: string, currentStepIndex: number): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE runs_metadata SET current_step = $1, updated_at = NOW() WHERE run_id = $2
    `;

    try {
      await pool.query(query, [currentStepIndex, runId]);
    } catch (err) {
      logger.error(
        { err, runId, currentStepIndex },
        'Failed to mark state'
      );
      throw err;
    }
  }

  static async getCheckpointedStepIndex(runId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT current_step FROM runs_metadata WHERE run_id = $1`;

    try {
      const result = await pool.query(query, [runId]);
      if (result.rows.length === 0) return 0;
      return result.rows[0].current_step;
    } catch (err) {
      logger.error({ err, runId }, 'Failed to get checkpoint');
      return 0; // Default to start if not found
    }
  }
}
