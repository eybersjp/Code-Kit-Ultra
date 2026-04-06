// Re-export everything from contracts as the public surface
export type {
  PromptMode,
  PromptStatus,
  PromptChannel,
  PolicyBinding,
  InsForgeBinding,
  AuditConfig,
  PromptManifest,
  PromptBuildContext,
  PromptBuildContextActor,
  PromptBuildContextTenant,
  PromptBuildContextSession,
  PromptBuildContextPolicy,
  PromptBuildContextRun,
  AdapterInfo,
  MemoryContext,
  VerificationContext,
  BuiltPromptArtifact,
  PromptRegistryEntry,
  PromptRegistry,
} from './contracts.js';

// ─── Context Block Union ─────────────────────────────────────────────────────

/**
 * All recognized named context block keys that may appear in a prompt manifest's
 * `allowed_context_blocks` or `required_context_blocks` arrays.
 */
export type ContextBlock =
  | 'tenant-session'
  | 'machine-execution'
  | 'policy/default-policy'
  | 'policy/high-risk-policy'
  | 'modes/safe'
  | 'modes/balanced'
  | 'modes/god'
  | 'insforge/tenant-session'
  | 'insforge/machine-execution'
  | 'execution-state'
  | 'memory'
  | 'adapters'
  | 'verification';

// ─── Internal Utility Types ───────────────────────────────────────────────────

/**
 * Raw input shape accepted by the resolver functions before validation.
 */
export interface RawSessionInput {
  authMode: string;
  permissions: string[];
  roles: string[];
}

export interface RawTenantInput {
  orgId: string;
  workspaceId: string;
  projectId: string;
  projectName?: string;
}

export interface RawPolicyInput {
  riskThreshold?: string;
  approvalRequired?: boolean;
  restrictedCapabilities?: string[];
  allowedAdapters?: string[];
}

export interface RawRunInput {
  runId: string;
  correlationId: string;
  goal: string;
  currentPhase?: string;
  priorSummary?: string;
}

export interface RawMemoryInput {
  recentFailures?: string[];
  successfulPatterns?: string[];
  rejectedApproaches?: string[];
}

export interface RawAdapterInput {
  name: string;
  available: boolean;
  capabilities: string[];
}

// ─── Capability Evaluation Result ────────────────────────────────────────────

export interface CapabilityEvaluationResult {
  allowed: boolean;
  missing: string[];
  restricted: string[];
}

// ─── Audit Execution Result ───────────────────────────────────────────────────

export interface AuditExecutionResult {
  outcome: string;
  schemaValid: boolean;
  gateRequired: boolean;
}
