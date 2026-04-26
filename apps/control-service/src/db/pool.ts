import pg from 'pg';
import { logger } from '../lib/logger.js';
import { setPool } from '../../../../packages/shared/src/db.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let initialized = false;

function initializePool() {
  if (initialized) return;
  initialized = true;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    min: 2,
    max: 10,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle client');
  });

  // Register with shared pool registry so packages can use getPool()
  setPool(pool);
}

export function getPool() {
  if (!pool) {
    initializePool();
  }
  return pool!;
}

export async function testConnection() {
  try {
    const activePool = getPool();
    const client = await activePool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    return false;
  }
}

export async function closePool() {
  const activePool = getPool();
  await activePool.end();
}
