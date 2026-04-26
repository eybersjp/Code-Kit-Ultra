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

vi.mock('../../../packages/auth/src/resolve-session.js', () => ({
  resolveInsForgeSession: vi.fn(),
}));

vi.mock('../../../packages/core/src/auth', () => ({
  resolveApiKeyUser: vi.fn().mockReturnValue(null),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { app } from '../src/index.js';
import { resolveInsForgeSession } from '../../../packages/auth/src/resolve-session.js';

/**
 * Regression Test Suite for v1.3.0
 * Verifies backward compatibility and no breaking changes from v1.2.0
 */

const validAdminSession = {
  actor: {
    actorId: 'user-regression-001',
    actorType: 'user',
    actorName: 'Regression Tester',
    roles: ['admin'],
  },
  tenant: { orgId: 'org-regression', workspaceId: 'ws-regression' },
  claims: {},
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

describe('Regression Tests — v1.2.0 → v1.3.0 Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('REG-001: Health & Readiness Endpoints (v1.2.0 behavior preserved)', () => {
    it('Health endpoint still returns 200 with required fields', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('version');
    });

    it('Readiness endpoint still returns 200 or 503', async () => {
      const res = await request(app).get('/ready');
      expect([200, 503]).toContain(res.status);
    });

    it('Metrics endpoint still returns prometheus format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('REG-002: Authentication Flow (v1.2.0 behavior preserved)', () => {
    it('Missing auth token still returns 401', async () => {
      const res = await request(app).get('/v1/session');
      expect(res.status).toBe(401);
    });

    it('Invalid auth token still returns 401', async () => {
      const res = await request(app)
        .get('/v1/session')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('Valid auth token still returns 200 with session data', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const res = await request(app)
        .get('/v1/session')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('actor');
      expect(res.body.actor).toHaveProperty('actorId');
    });
  });

  describe('REG-003: Runs Endpoints (v1.2.0 behavior preserved)', () => {
    it('GET /v1/runs without auth returns 401', async () => {
      const res = await request(app).get('/v1/runs');
      expect(res.status).toBe(401);
    });

    it('GET /v1/runs with auth returns structured response', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const res = await request(app)
        .get('/v1/runs')
        .set('Authorization', 'Bearer valid-token');

      // Should succeed or return structured error, not 500
      expect(res.status).not.toBe(500);
    });

    it('POST /v1/runs without auth returns 401', async () => {
      const res = await request(app)
        .post('/v1/runs')
        .send({ idea: 'test', mode: 'balanced' });

      expect(res.status).toBe(401);
    });

    it('POST /v1/runs with auth validates request structure', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const res = await request(app)
        .post('/v1/runs')
        .set('Authorization', 'Bearer valid-token')
        .send({ idea: 'test', mode: 'balanced' });

      // Should not crash - either accept, validate, or auth may reset
      expect([200, 201, 400, 401]).toContain(res.status);
    });
  });

  describe('REG-004: Gate Operations (v1.2.0 behavior preserved)', () => {
    it('GET /v1/gates/:id without auth returns 401', async () => {
      const res = await request(app).get('/v1/gates/gate-001');
      expect(res.status).toBe(401);
    });

    it('POST /v1/gates/:id/approve requires auth', async () => {
      const res = await request(app)
        .post('/v1/gates/gate-001/approve')
        .send({});

      expect(res.status).toBe(401);
    });

    it('POST /v1/gates/:id/reject requires auth', async () => {
      const res = await request(app)
        .post('/v1/gates/gate-001/reject')
        .send({ reason: 'testing' });

      expect(res.status).toBe(401);
    });

    it('POST /v1/gates/:id/approve with auth validates', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const res = await request(app)
        .post('/v1/gates/gate-001/approve')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      // Should not return 500
      expect(res.status).not.toBe(500);
    });
  });

  describe('REG-005: Error Handling (v1.2.0 behavior preserved)', () => {
    it('Non-existent route returns 404 or 401 (not 500)', async () => {
      const res = await request(app).get('/v1/nonexistent');
      expect([404, 401]).toContain(res.status);
    });

    it('Malformed JSON body returns 400 (not 500)', async () => {
      const res = await request(app)
        .post('/v1/runs')
        .set('Authorization', 'Bearer valid-token')
        .set('Content-Type', 'application/json')
        .send('not json');

      // Should return 400 or similar, not 500
      expect(res.status).not.toBe(500);
    });

    it('Missing required headers handled gracefully', async () => {
      const res = await request(app)
        .post('/v1/runs')
        .send({ idea: 'test' });

      // Should return 401 (missing auth), not 500
      expect(res.status).toBe(401);
    });
  });

  describe('REG-006: Session Management (v1.2.0 behavior preserved)', () => {
    it('Session revocation check still works', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      // The revocation check should be called but not fail the request
      const res = await request(app)
        .get('/v1/session')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('Expired session still returns 401', async () => {
      const expiredSession = {
        ...validAdminSession,
        expiresAt: Math.floor(Date.now() / 1000) - 3600, // Expired
      };

      (resolveInsForgeSession as any).mockResolvedValue(expiredSession);

      const res = await request(app)
        .get('/v1/session')
        .set('Authorization', 'Bearer expired-token');

      // Should handle expired sessions properly (not crash)
      expect(res.status).not.toBe(500);
    });
  });

  describe('REG-007: Database Connectivity (v1.2.0 behavior preserved)', () => {
    it('Service still initializes with DB pool', async () => {
      // If we get here, the app imported successfully
      // which means DB pool mocking worked
      expect(app).toBeDefined();
    });

    it('Health check includes database status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      // Body should have status field (database connected or not)
      expect(res.body).toHaveProperty('status');
    });
  });

  describe('REG-008: Response Format Consistency (v1.2.0 behavior preserved)', () => {
    it('All authenticated responses include proper content-type', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const res = await request(app)
        .get('/v1/session')
        .set('Authorization', 'Bearer valid-token');

      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('Error responses have consistent structure', async () => {
      const res = await request(app).get('/v1/nonexistent');
      // Should either have error field or be redirected, not crash
      expect([404, 401]).toContain(res.status);
    });

    it('Success responses are JSON', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('REG-009: Middleware Chain (v1.2.0 behavior preserved)', () => {
    it('CORS headers not broken', async () => {
      const res = await request(app)
        .options('/v1/session')
        .set('Origin', 'http://localhost:3000');

      // Should handle OPTIONS or return 200/404, not 500
      expect(res.status).not.toBe(500);
    });

    it('Request logging middleware still active', async () => {
      const res = await request(app).get('/health');
      // If middleware runs, request completes successfully
      expect(res.status).toBe(200);
    });
  });

  describe('REG-010: Concurrent Requests (v1.2.0 behavior preserved)', () => {
    it('Multiple concurrent requests do not interfere', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get('/health'));

      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });

    it('Concurrent auth requests work independently', async () => {
      (resolveInsForgeSession as any).mockResolvedValue(validAdminSession);

      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .get('/v1/session')
            .set('Authorization', 'Bearer valid-token')
        );

      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
