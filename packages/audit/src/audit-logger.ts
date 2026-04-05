import crypto from 'crypto';
import { getPool } from '../../shared/src/db.js';
import { logger } from '../../shared/src/logger.js';
import { insforgeClient } from '../../insforge/src/client.js';

export interface AuditEvent {
  id: string;
  orgId: string;
  actor: string;
  actorType?: string;
  correlationId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'success' | 'failure' | 'blocked' | 'approved' | 'rejected';
  payload: Record<string, any>;
  hash: string;
  previousHash: string;
  createdAt: Date;
}

export class AuditLogger {
  static async getLastHash(orgId: string): Promise<string> {
    const pool = getPool();
    const query = `
      SELECT hash FROM audit_events
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [orgId]);
      if (result.rows.length === 0) {
        return crypto.createHash('sha256').update('0').digest('hex');
      }
      return result.rows[0].hash;
    } catch (err) {
      logger.error({ err, orgId }, 'Failed to get last hash');
      // Return default hash on error
      return crypto.createHash('sha256').update('0').digest('hex');
    }
  }

  static computeHash(data: string, previousHash: string): string {
    const combined = previousHash + data;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  static async emit(event: Omit<AuditEvent, 'id' | 'hash' | 'previousHash' | 'createdAt'>): Promise<void> {
    const pool = getPool();

    try {
      // Use advisory lock to prevent concurrent writes
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(1)');

        // Get last hash
        const lastHashResult = await client.query(
          'SELECT hash FROM audit_events WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1',
          [event.orgId]
        );

        const previousHash = lastHashResult.rows.length === 0
          ? crypto.createHash('sha256').update('0').digest('hex')
          : lastHashResult.rows[0].hash;

        // Compute new hash
        const eventData = JSON.stringify(event);
        const hash = this.computeHash(eventData, previousHash);

        // Insert audit event
        const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const query = `
          INSERT INTO audit_events (
            id, org_id, actor, action, resource_type, resource_id,
            result, payload, hash, previous_hash, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `;

        await client.query(query, [
          id,
          event.orgId,
          event.actor,
          event.action,
          event.resourceType,
          event.resourceId,
          event.result,
          JSON.stringify(event.payload),
          hash,
          previousHash,
        ]);

        await client.query('COMMIT');
        logger.debug(
          { eventId: id, action: event.action, hash },
          'Audit event recorded'
        );

        // Dual-emit to InsForge for authoritative audit anchoring (non-blocking)
        insforgeClient.emitAuditEvent({
          correlationId: event.correlationId ?? id,
          orgId: event.orgId,
          actorId: event.actor,
          actorType: event.actorType ?? 'user',
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          result: event.result as 'success' | 'failure' | 'blocked' | 'approved' | 'rejected',
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
          payload: event.payload,
        }).catch((err: unknown) => {
          logger.warn({ err }, 'InsForge audit emit failed (non-fatal)');
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error(
        { err, action: event.action, resourceId: event.resourceId },
        'Failed to emit audit event'
      );
      throw err;
    }
  }

  static async getAuditTrail(orgId: string, resourceId?: string): Promise<AuditEvent[]> {
    const pool = getPool();

    let query = `
      SELECT * FROM audit_events
      WHERE org_id = $1
    `;
    const params: any[] = [orgId];

    if (resourceId) {
      query += ` AND resource_id = $2`;
      params.push(resourceId);
    }

    query += ` ORDER BY created_at DESC LIMIT 1000`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        orgId: row.org_id,
        actor: row.actor,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        result: row.result,
        payload: JSON.parse(row.payload),
        hash: row.hash,
        previousHash: row.previous_hash,
        createdAt: row.created_at,
      }));
    } catch (err) {
      logger.error({ err, orgId, resourceId }, 'Failed to get audit trail');
      throw err;
    }
  }
}
