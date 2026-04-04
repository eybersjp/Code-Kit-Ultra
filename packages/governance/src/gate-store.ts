import { getPool } from '../../apps/control-service/src/db/pool.js';
import { GateResult } from '../../packages/shared/src/types.js';
import { logger } from '../../apps/control-service/src/lib/logger.js';

export interface GateDecision {
  id: string;
  gateId: string;
  runId: string;
  status: 'pass' | 'fail' | 'needs-review' | 'blocked';
  result: GateResult;
  reviewerId?: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GateStore {
  static async recordGateDecision(
    gateId: string,
    runId: string,
    result: GateResult,
    status: 'pass' | 'fail' | 'needs-review' | 'blocked' = 'pass',
    reviewerId?: string
  ): Promise<void> {
    const pool = getPool();
    const query = `
      INSERT INTO gates (
        id, gate_id, run_id, status, result, reviewer_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE
      SET status = $4, result = $5, reviewer_id = $6, updated_at = NOW()
    `;

    const id = `gate-${runId}-${gateId}-${Date.now()}`;

    try {
      await pool.query(query, [
        id,
        gateId,
        runId,
        status,
        JSON.stringify(result),
        reviewerId || null,
      ]);
    } catch (err) {
      logger.error(
        { err, gateId, runId, status },
        'Failed to record gate decision'
      );
      throw err;
    }
  }

  static async getPendingGates(runId: string): Promise<GateDecision[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM gates
      WHERE run_id = $1 AND status = 'needs-review'
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [runId]);
      return result.rows.map((row) => ({
        id: row.id,
        gateId: row.gate_id,
        runId: row.run_id,
        status: row.status,
        result: JSON.parse(row.result),
        reviewerId: row.reviewer_id,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      logger.error({ err, runId }, 'Failed to get pending gates');
      throw err;
    }
  }

  static async approveGate(gateId: string, reviewerId: string): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE gates
      SET status = 'pass', reviewer_id = $1, updated_at = NOW()
      WHERE gate_id = $2 AND status = 'needs-review'
    `;

    try {
      await pool.query(query, [reviewerId, gateId]);
    } catch (err) {
      logger.error({ err, gateId, reviewerId }, 'Failed to approve gate');
      throw err;
    }
  }

  static async rejectGate(
    gateId: string,
    reviewerId: string,
    reason: string
  ): Promise<void> {
    const pool = getPool();
    const query = `
      UPDATE gates
      SET status = 'blocked', reviewer_id = $1, reason = $2, updated_at = NOW()
      WHERE gate_id = $3 AND status = 'needs-review'
    `;

    try {
      await pool.query(query, [reviewerId, reason, gateId]);
    } catch (err) {
      logger.error({ err, gateId, reviewerId }, 'Failed to reject gate');
      throw err;
    }
  }

  static async getGateDecision(
    gateId: string,
    runId: string
  ): Promise<GateDecision | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM gates
      WHERE gate_id = $1 AND run_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [gateId, runId]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        gateId: row.gate_id,
        runId: row.run_id,
        status: row.status,
        result: JSON.parse(row.result),
        reviewerId: row.reviewer_id,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      logger.error(
        { err, gateId, runId },
        'Failed to get gate decision'
      );
      throw err;
    }
  }
}
