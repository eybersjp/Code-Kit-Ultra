import { logger } from '../../shared/src/logger.js';
import type {
  InsForgeConfig,
  SignedExecutionContext,
  PolicyDecision,
  ApprovalState,
  InsForgeAuditEvent,
  ExecutionContextRequest,
} from './types.js';

/**
 * InsForge API client
 * Handles all communication with the InsForge control-plane
 */
export class InsForgeClient {
  private readonly config: InsForgeConfig;

  constructor(config?: Partial<InsForgeConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.INSFORGE_API_KEY ?? '',
      apiBaseUrl: config?.apiBaseUrl ?? process.env.INSFORGE_API_BASE_URL ?? '',
      projectId: config?.projectId ?? process.env.INSFORGE_PROJECT_ID ?? '',
    };

    if (!this.config.apiKey) {
      logger.warn('InsForge API key not configured; integration will be skipped');
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiBaseUrl);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl.replace(/\/$/, '')}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-InsForge-Project': this.config.projectId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`InsForge API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Exchange an actor token for an InsForge-signed execution context
   */
  async getSignedContext(
    correlationId: string,
    actorToken: string
  ): Promise<SignedExecutionContext | null> {
    if (!this.isConfigured) return null;

    try {
      return await this.request<SignedExecutionContext>('POST', '/api/v1/context/sign', {
        correlationId,
        actorToken,
        projectId: this.config.projectId,
      });
    } catch (err) {
      logger.error({ err, correlationId }, 'Failed to get signed context from InsForge');
      return null;
    }
  }

  /**
   * Submit risk metadata and request a policy decision before execution
   */
  async evaluatePolicy(req: ExecutionContextRequest): Promise<PolicyDecision> {
    if (!this.isConfigured) {
      // Fail open when InsForge is not configured (development mode)
      return { allowed: true, requiresApproval: false };
    }

    try {
      return await this.request<PolicyDecision>('POST', '/api/v1/policy/evaluate', req);
    } catch (err) {
      logger.error({ err, correlationId: req.correlationId }, 'Policy evaluation failed; failing open');
      return { allowed: true, requiresApproval: false };
    }
  }

  /**
   * Submit an audit event to InsForge for authoritative record-keeping
   */
  async emitAuditEvent(event: InsForgeAuditEvent): Promise<void> {
    if (!this.isConfigured) return;

    try {
      await this.request<void>('POST', '/api/v1/audit/events', {
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
        projectId: this.config.projectId,
      });
    } catch (err) {
      // Audit emit failure must not block execution — log and continue
      logger.error({ err, correlationId: event.correlationId }, 'Failed to emit audit event to InsForge');
    }
  }

  /**
   * Fetch current approval state for a pending execution
   */
  async getApprovalState(approvalId: string): Promise<ApprovalState | null> {
    if (!this.isConfigured) return null;

    try {
      return await this.request<ApprovalState>('GET', `/api/v1/approvals/${approvalId}`);
    } catch (err) {
      logger.error({ err, approvalId }, 'Failed to get approval state from InsForge');
      return null;
    }
  }

  /**
   * Check if a token/session has been revoked via InsForge
   */
  async isRevoked(jti: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const result = await this.request<{ revoked: boolean }>('GET', `/api/v1/tokens/${jti}/revoked`);
      return result.revoked;
    } catch (err) {
      logger.error({ err, jti }, 'Failed to check revocation status from InsForge; assuming not revoked');
      return false;
    }
  }

  /**
   * Send execution state transition to InsForge control plane
   */
  async reportStatus(
    correlationId: string,
    status: 'started' | 'checkpoint' | 'completed' | 'failed' | 'rolled_back',
    payload?: Record<string, unknown>
  ): Promise<void> {
    if (!this.isConfigured) return;

    try {
      await this.request<void>('POST', '/api/v1/executions/status', {
        correlationId,
        status,
        projectId: this.config.projectId,
        timestamp: new Date().toISOString(),
        payload,
      });
    } catch (err) {
      logger.warn({ err, correlationId, status }, 'Failed to report execution status to InsForge');
    }
  }
}

// Singleton instance
export const insforgeClient = new InsForgeClient();
