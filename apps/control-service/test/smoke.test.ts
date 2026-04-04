import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock all DB and Redis before importing the app
vi.mock('../src/db/pool.js', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    end: vi.fn(),
    on: vi.fn(),
  })),
  testConnection: vi.fn().mockResolvedValue(true),
  closePool: vi.fn(),
}));

vi.mock('../../../packages/auth/src/session-revocation.js', () => ({
  initializeRevocationStore: vi.fn(),
  isRevoked: vi.fn().mockResolvedValue(false),
  revokeSession: vi.fn(),
  closeRevocationStore: vi.fn(),
}));

vi.mock('../src/db/migrate.js', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/db/seed.js', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth to avoid real JWT validation
vi.mock('../../../packages/auth/src/resolve-session.js', () => ({
  resolveInsForgeSession: vi.fn().mockRejectedValue(new Error('No token')),
}));

vi.mock('../../../packages/core/src/auth', () => ({
  resolveApiKeyUser: vi.fn().mockReturnValue(null),
}));

import { app } from '../src/index.js';
import { resolveInsForgeSession } from '../../../packages/auth/src/resolve-session.js';

// Shared valid session for authenticated tests
const validAdminSession = {
  actor: {
    actorId: 'user-smoke-001',
    actorType: 'user',
    actorName: 'Smoke Tester',
    roles: ['admin'],
  },
  tenant: { orgId: 'org-smoke', workspaceId: 'ws-smoke' },
  claims: {},
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

describe('Smoke Tests — Startup & Health', () => {
  it('S-001: GET /health returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBeDefined();
  });

  it('S-002: GET /ready returns 200 or 503 depending on checks', async () => {
    const res = await request(app).get('/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toBeDefined();
    expect(typeof res.body.checks.database).toBe('boolean');
  });

  it('S-003: GET /metrics returns 200 with prometheus content type', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});

describe('Smoke Tests — Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default rejection so unauthenticated tests work
    (resolveInsForgeSession as any).mockRejectedValue(new Error('No token'));
  });

  it('A-001: GET /v1/session with no token returns 401', async () => {
    const res = await request(app).get('/v1/session');
    expect(res.status).toBe(401);
  });

  it('A-002: GET /v1/session with valid mocked token returns session data', async () => {
    (resolveInsForgeSession as any).mockResolvedValueOnce(validAdminSession);

    const res = await request(app)
      .get('/v1/session')
      .set('Authorization', 'Bearer valid-mocked-token');

    expect(res.status).toBe(200);
    expect(res.body.actor.actorId).toBe('user-smoke-001');
  });

  it('A-003: GET /v1/runs with no token returns 401', async () => {
    const res = await request(app).get('/v1/runs');
    expect(res.status).toBe(401);
  });

  it('A-004: POST /v1/runs with no token returns 401', async () => {
    const res = await request(app)
      .post('/v1/runs')
      .send({ idea: 'test', mode: 'balanced' });
    expect(res.status).toBe(401);
  });
});

describe('Smoke Tests — Runs (auth required)', () => {
  it('R-001: POST /v1/runs requires authentication', async () => {
    const res = await request(app)
      .post('/v1/runs')
      .set('Authorization', 'Bearer invalid-token')
      .send({ idea: 'test', mode: 'balanced' });
    expect(res.status).toBe(401);
  });

  it('R-002: GET /v1/runs requires authentication', async () => {
    const res = await request(app)
      .get('/v1/runs')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('Smoke Tests — Gates (auth required)', () => {
  it('G-001: POST /v1/gates/:id/approve requires authentication', async () => {
    const res = await request(app)
      .post('/v1/gates/gate-123/approve')
      .set('Authorization', 'Bearer invalid-token')
      .send({});
    expect(res.status).toBe(401);
  });

  it('G-002: POST /v1/gates/:id/reject requires authentication', async () => {
    const res = await request(app)
      .post('/v1/gates/gate-123/reject')
      .set('Authorization', 'Bearer invalid-token')
      .send({ reason: 'test' });
    expect(res.status).toBe(401);
  });
});

describe('Smoke Tests — Deprecated routes', () => {
  it('D-001: Unversioned /runs route is gone (returns 404 or 410)', async () => {
    const res = await request(app).get('/runs');
    expect([404, 410]).toContain(res.status);
  });

  it('D-002: Unversioned /approvals route is gone (returns 404 or 410)', async () => {
    const res = await request(app).get('/approvals');
    expect([404, 410]).toContain(res.status);
  });
});
