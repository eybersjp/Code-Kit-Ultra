// Pool registry — decouples packages from the app-level pool implementation.
// The app calls setPool() at startup; packages call getPool() to obtain it.

export interface DbPool {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
  connect(): Promise<{
    query(text: string, values?: any[]): Promise<{ rows: any[] }>;
    release(): void;
  }>;
}

let _pool: DbPool | null = null;

export function setPool(pool: DbPool): void {
  _pool = pool;
}

export function getPool(): DbPool {
  if (!_pool) {
    throw new Error('Database pool not initialized. Call setPool() before using packages that require DB access.');
  }
  return _pool;
}
