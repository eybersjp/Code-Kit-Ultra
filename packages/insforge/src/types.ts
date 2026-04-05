/**
 * InsForge integration types
 * Matches the signed execution context contract described in the partnership prospectus
 */

export interface InsForgeConfig {
  apiKey: string;
  apiBaseUrl: string;
  projectId: string;
}

/**
 * Signed execution context returned by InsForge
 * Carries org, workspace, actor, role, environment, and correlation identifiers
 */
export interface SignedExecutionContext {
  orgId: string;
  workspaceId: string;
  projectId: string;
  actorId: string;
  actorType: 'user' | 'service_account' | 'system';
  role: string;
  environment: 'development' | 'staging' | 'production';
  correlationId: string;
  policyScope: string[];
  expiresAt: number; // unix timestamp
  signature: string; // InsForge-issued signature for integrity
}

/**
 * Policy decision returned by InsForge PDP
 */
export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  deniedReason?: string;
  approvalRoles?: string[];
  policyId?: string;
}

/**
 * Approval state managed by InsForge
 */
export interface ApprovalState {
  approvalId: string;
  correlationId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requiredRoles: string[];
  approvedBy?: string;
  rejectedBy?: string;
  reason?: string;
  expiresAt?: number;
  evidence?: Record<string, unknown>;
}

/**
 * Audit event sent to InsForge
 */
export interface InsForgeAuditEvent {
  correlationId: string;
  orgId: string;
  actorId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'success' | 'failure' | 'blocked' | 'approved' | 'rejected';
  environment: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Execution context submission sent to InsForge before CKU executes
 */
export interface ExecutionContextRequest {
  correlationId: string;
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  actorId: string;
  actionType: string;
  riskMetadata: {
    riskScore: number;
    blastRadius: string;
    affectedFiles: string[];
    requiresApproval: boolean;
  };
}
