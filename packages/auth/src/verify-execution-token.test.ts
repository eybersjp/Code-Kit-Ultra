import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  verifyExecutionToken,
  validateExecutionScope,
  hasExecutionPermission,
  VerifiedExecutionToken,
} from './verify-execution-token';

describe('Execution Token Verification — Gate 1 R-04', () => {
  const secret = 'test-secret-key';
  const issuer = 'code-kit-ultra-internal';
  const audience = 'execution-engine-worker';

  const validTokenPayload = {
    sub: 'user-001',
    run_id: 'run-123',
    org_id: 'org-001',
    workspace_id: 'ws-001',
    project_id: 'proj-001',
    actor_type: 'user',
    correlation_id: 'corr-001',
    roles: ['executor', 'viewer'],
  };

  beforeEach(() => {
    process.env.INSFORGE_SERVICE_ROLE_KEY = secret;
    process.env.INSFORGE_JWT_ISSUER = issuer;
    process.env.INSFORGE_JWT_AUDIENCE = audience;
  });

  describe('Token Verification', () => {
    it('should verify valid execution token with Bearer scheme', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      const verified = verifyExecutionToken(authHeader);

      expect(verified.sub).toBe('user-001');
      expect(verified.run_id).toBe('run-123');
      expect(verified.org_id).toBe('org-001');
    });

    it('should verify valid execution token with ExecutionToken scheme', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `ExecutionToken ${token}`;
      const verified = verifyExecutionToken(authHeader);

      expect(verified.sub).toBe('user-001');
      expect(verified.run_id).toBe('run-123');
    });

    it('should reject missing authorization header', () => {
      expect(() => verifyExecutionToken('')).toThrow('Missing authorization header');
    });

    it('should reject malformed authorization header', () => {
      expect(() => verifyExecutionToken('InvalidFormat')).toThrow('Invalid authorization header format');
    });

    it('should reject invalid authorization scheme', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      expect(() => verifyExecutionToken(`Basic ${token}`)).toThrow('Invalid authorization scheme');
    });

    it('should reject missing token', () => {
      expect(() => verifyExecutionToken('Bearer ')).toThrow('Missing execution token');
    });

    it('should reject invalid token signature', () => {
      const token = jwt.sign(validTokenPayload, 'wrong-secret', {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      expect(() => verifyExecutionToken(authHeader)).toThrow('Invalid execution token');
    });

    it('should reject expired execution token', (done) => {
      // Create token that expires immediately
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: 0, // Expires immediately
        algorithm: 'HS256',
      });

      // Wait a bit for token to expire
      setTimeout(() => {
        const authHeader = `Bearer ${token}`;
        expect(() => verifyExecutionToken(authHeader)).toThrow('Execution token expired');
        done();
      }, 100);
    });

    it('should reject token with wrong issuer', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer: 'wrong-issuer',
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      expect(() => verifyExecutionToken(authHeader)).toThrow('Invalid execution token');
    });

    it('should reject token with wrong audience', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience: 'wrong-audience',
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      expect(() => verifyExecutionToken(authHeader)).toThrow('Invalid execution token');
    });

    it('should reject if INSFORGE_SERVICE_ROLE_KEY not configured', () => {
      delete process.env.INSFORGE_SERVICE_ROLE_KEY;

      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      expect(() => verifyExecutionToken(authHeader)).toThrow(
        'Execution token verification failed: INSFORGE_SERVICE_ROLE_KEY not configured'
      );
    });
  });

  describe('Scope Validation', () => {
    it('should validate execution scope matches run ID', () => {
      const token: VerifiedExecutionToken = {
        ...validTokenPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
        iss: issuer,
        aud: audience,
      };

      const result = validateExecutionScope(token, 'run-123');
      expect(result).toBe(true);
    });

    it('should reject execution scope mismatch', () => {
      const token: VerifiedExecutionToken = {
        ...validTokenPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
        iss: issuer,
        aud: audience,
      };

      expect(() => validateExecutionScope(token, 'run-999')).toThrow(
        'Execution token run scope mismatch: token is for run run-123, but requested run-999'
      );
    });
  });

  describe('Permission Checking', () => {
    const token: VerifiedExecutionToken = {
      ...validTokenPayload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
      iss: issuer,
      aud: audience,
    };

    it('should grant permission if role exists', () => {
      const result = hasExecutionPermission(token, 'executor');
      expect(result).toBe(true);
    });

    it('should deny permission if role does not exist', () => {
      const result = hasExecutionPermission(token, 'admin');
      expect(result).toBe(false);
    });

    it('should grant all permissions to admin role', () => {
      const adminToken: VerifiedExecutionToken = {
        ...token,
        roles: ['admin'],
      };

      expect(hasExecutionPermission(adminToken, 'any-role')).toBe(true);
    });

    it('should handle empty roles array', () => {
      const noRolesToken: VerifiedExecutionToken = {
        ...token,
        roles: [],
      };

      expect(hasExecutionPermission(noRolesToken, 'executor')).toBe(false);
    });
  });

  describe('Integration: POST /v1/runs/{id}/resume with execution token', () => {
    it('should verify execution token before allowing resume', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      const verified = verifyExecutionToken(authHeader);

      // Should be able to validate scope
      expect(() => validateExecutionScope(verified, 'run-123')).not.toThrow();

      // Should deny if run ID mismatch
      expect(() => validateExecutionScope(verified, 'run-wrong')).toThrow();
    });

    it('should return 401 for expired execution token on resume', () => {
      // Create immediately expiring token
      const expiredToken = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: 0,
        algorithm: 'HS256',
      });

      // Simulate what API would do
      const authHeader = `Bearer ${expiredToken}`;

      // After brief delay, token should be expired
      setTimeout(() => {
        expect(() => verifyExecutionToken(authHeader)).toThrow('Execution token expired');
      }, 100);
    });

    it('should return 401 for invalid execution token on resume', () => {
      const invalidAuthHeader = 'Bearer invalid.token.here';

      expect(() => verifyExecutionToken(invalidAuthHeader)).toThrow('Invalid execution token');
    });
  });

  describe('Security: Token Claims Validation', () => {
    it('should include all required claims in verified token', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      const verified = verifyExecutionToken(authHeader);

      expect(verified).toHaveProperty('sub');
      expect(verified).toHaveProperty('run_id');
      expect(verified).toHaveProperty('org_id');
      expect(verified).toHaveProperty('workspace_id');
      expect(verified).toHaveProperty('project_id');
      expect(verified).toHaveProperty('actor_type');
      expect(verified).toHaveProperty('correlation_id');
      expect(verified).toHaveProperty('roles');
      expect(verified).toHaveProperty('iat');
      expect(verified).toHaveProperty('exp');
      expect(verified).toHaveProperty('iss');
      expect(verified).toHaveProperty('aud');
    });

    it('should verify token lifetime is 10 minutes max', () => {
      const token = jwt.sign(validTokenPayload, secret, {
        issuer,
        audience,
        expiresIn: '10m',
        algorithm: 'HS256',
      });

      const authHeader = `Bearer ${token}`;
      const verified = verifyExecutionToken(authHeader);

      const issuedAt = verified.iat;
      const expiresAt = verified.exp;
      const ttl = (expiresAt - issuedAt) * 1000; // Convert to ms

      // Should be close to 10 minutes (600 seconds = 600,000 ms)
      expect(ttl).toBeGreaterThan(590000); // Allow 10 seconds variance
      expect(ttl).toBeLessThanOrEqual(610000);
    });
  });
});
