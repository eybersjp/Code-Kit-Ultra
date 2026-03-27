/**
 * InsForge-backed session flow for Web Control Plane.
 */

export interface SessionInfo {
  token: string;
  actorId: string;
  actorName: string;
  orgId: string;
  workspaceId: string;
  projectId?: string;
  roles: string[];
}

const SESSION_KEY = 'cku_session';

export const auth = {
  getSession(): SessionInfo | null {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  setSession(info: SessionInfo) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(info));
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getSession();
  },

  getToken(): string | null {
    return this.getSession()?.token || null;
  },

  updateContext(context: Partial<Pick<SessionInfo, 'orgId' | 'workspaceId' | 'projectId'>>) {
    const session = this.getSession();
    if (session) {
      this.setSession({ ...session, ...context });
    }
  }
};
