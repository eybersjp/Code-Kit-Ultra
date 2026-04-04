import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './pool.js';
import { logger } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationsTable(pool: any) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await pool.query(createTableQuery);
}

async function getAppliedMigrations(pool: any): Promise<string[]> {
  const result = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return result.rows.map((r) => r.version);
}

async function getMigrationFiles(): Promise<string[]> {
  // Migrations live in ../../db/migrations relative to this file
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.warn({ dir: migrationsDir }, 'Migrations directory not found');
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files;
}

async function runMigration(pool: any, fileName: string): Promise<void> {
  const filePath = path.resolve(__dirname, '../../db/migrations', fileName);
  const version = fileName.replace('.sql', '');

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Run migration in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );
      await client.query('COMMIT');
      logger.info({ migration: version }, 'Migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err, migration: fileName }, 'Failed to apply migration');
    throw err;
  }
}

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  try {
    logger.info('Starting database migrations');

    // Ensure migrations table exists
    await ensureMigrationsTable(pool);

    // Get list of applied and pending migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    const migrationFiles = await getMigrationFiles();

    const pendingMigrations = migrationFiles.filter(
      (f) => !appliedMigrations.includes(f.replace('.sql', ''))
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    // Apply pending migrations in order
    for (const migration of pendingMigrations) {
      await runMigration(pool, migration);
    }

    logger.info(
      { count: pendingMigrations.length },
      'All migrations completed'
    );
  } catch (err) {
    logger.error({ err }, 'Migration failed, aborting startup');
    throw err;
  }
}
