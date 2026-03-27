import * as vscode from 'vscode';
import axios from 'axios';

export interface SessionInfo {
  actor: {
    actorId: string;
    actorType: string;
    actorName?: string;
  };
  tenant: {
    orgId: string;
    workspaceId: string;
    projectId?: string;
  };
  expiresAt: number;
}

/**
 * Wave 6: Session Manager for VS Code Extension.
 * Handles token storage, session verification via /v1/session, and sign-in/out state.
 */
export class SessionManager {
  private static instance: SessionManager;
  private _session: SessionInfo | null = null;
  private _token: string | null = null;

  private constructor(private context: vscode.ExtensionContext) {}

  /**
   * Initialize the session manager and load any cached token.
   */
  static async init(context: vscode.ExtensionContext): Promise<SessionManager> {
    const manager = new SessionManager(context);
    manager._token = await context.secrets.get('cku.sessionToken') || null;
    SessionManager.instance = manager;
    return manager;
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      throw new Error('SessionManager not initialized');
    }
    return SessionManager.instance;
  }

  get session() { return this._session; }
  get token() { return this._token; }
  
  /**
   * Returns true if we are in legacy mode OR have a valid session.
   */
  get isActive(): boolean {
    const config = vscode.workspace.getConfiguration('codeKitUltra');
    const authMode = config.get<string>('authMode');
    if (authMode === 'legacy-api-key') return true;
    return !!this._token && !!this._session;
  }

  get isExpired(): boolean {
    if (!this._session) return false;
    return Date.now() > this._session.expiresAt;
  }

  async setToken(token: string) {
    this._token = token;
    await this.context.secrets.store('cku.sessionToken', token);
    await this.refreshSession();
  }

  async signOut() {
    this._token = null;
    this._session = null;
    await this.context.secrets.delete('cku.sessionToken');
  }

  /**
   * Verifies the current token with the control service.
   */
  async refreshSession(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('codeKitUltra');
    const authMode = config.get<string>('authMode');
    
    if (authMode === 'legacy-api-key') {
      this._session = null; // No session info in legacy mode
      return true;
    }

    if (!this._token) {
      this._session = null;
      return false;
    }

    try {
      const baseUrl = config.get<string>('controlServiceUrl') || 'http://localhost:4000';
      const resp = await axios.get(`${baseUrl}/v1/session`, {
        headers: { Authorization: `Bearer ${this._token}` },
        timeout: 2000
      });
      this._session = resp.data;
      return true;
    } catch (err) {
      this._session = null;
      // If unauthorized, token is invalid
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
         // We keep the token but clear session to indicate "Expired/Invalid"
      }
      return false;
    }
  }
}
