import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auth } from './auth';

describe('Web Control Plane Auth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should start null', () => {
    expect(auth.getSession()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should store and retrieve session', () => {
    const mockSession = {
      token: 'test-token',
      actorId: 'user-1',
      actorName: 'Test User',
      orgId: 'org-1',
      workspaceId: 'ws-1',
      roles: ['admin']
    };

    auth.setSession(mockSession);
    expect(auth.getSession()).toEqual(mockSession);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getToken()).toBe('test-token');
  });

  it('should update context', () => {
    const mockSession = {
      token: 'test-token',
      actorId: 'user-1',
      actorName: 'Test User',
      orgId: 'org-1',
      workspaceId: 'ws-1',
      roles: ['admin']
    };

    auth.setSession(mockSession);
    auth.updateContext({ projectId: 'project-99' });

    const updated = auth.getSession();
    expect(updated?.projectId).toBe('project-99');
    expect(updated?.orgId).toBe('org-1');
  });

  it('should clear session', () => {
    auth.setSession({ token: 't' } as any);
    auth.clearSession();
    expect(auth.getSession()).toBeNull();
  });
});
