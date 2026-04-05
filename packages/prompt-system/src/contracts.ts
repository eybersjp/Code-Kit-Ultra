// ─── Primitive Enumerations ──────────────────────────────────────────────────

export type PromptMode = 'safe' | 'balanced' | 'god';

export type PromptStatus = 'draft' | 'stable' | 'deprecated';

export type PromptChannel = 'development' | 'staging' | 'production';

// ─── Manifest Sub-structures ─────────────────────────────────────────────────

export interface PolicyBinding {
  policyId: string;
  enforcementLevel: 'advisory' | 'blocking' | 'audit-only';
  riskThreshold?: string;
}

export interface InsForgeBinding {
  bindingId: string;
  auditLevel: 'minimal' | 'standard' | 'full';
  captureTokenUsage?: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  captureContext: boolean;
  captureOutput: boolean;
  retentionDays?: number;
}

// ─── Core Manifest ───────────────────────────────────────────────────────────

export interface PromptManifest {
  id: string;
  version: string;
  status: PromptStatus;
  channel: PromptChannel;
  role: string;
  title: string;
  description: string;
  owner: string;
  capabilities: string[];
  allowed_context_blocks: string[];
  required_context_blocks: string[];
  output_schema: string;
  template_file: string;
  supported_modes: PromptMode[];
  min_runtime_version?: string;
  policy_binding?: PolicyBinding;
  insforge_binding?: InsForgeBinding;
  audit?: AuditConfig;
}

// ─── Build Context ────────────────────────────────────────────────────────────

export interface PromptBuildContextActor {
  actorId: string;
  email?: string;
  name?: string;
}

export interface PromptBuildContextTenant {
  orgId: string;
  workspaceId: string;
  projectId: string;
  projectName?: string;
}

export interface PromptBuildContextSession {
  authMode: 'session' | 'service-account' | 'legacy-dev';
  permissions: string[];
  roles: string[];
}

export interface PromptBuildContextPolicy {
  riskThreshold: string;
  approvalRequired: boolean;
  restrictedCapabilities: string[];
  allowedAdapters: string[];
}

export interface PromptBuildContextRun {
  runId: string;
  correlationId: string;
  goal: string;
  currentPhase?: string;
  priorSummary?: string;
}

export interface AdapterInfo {
  name: string;
  available: boolean;
  capabilities: string[];
}

export interface MemoryContext {
  recentFailures: string[];
  successfulPatterns: string[];
  rejectedApproaches: string[];
}

export interface VerificationContext {
  checksEnabled: boolean;
  requiredSignoffs?: string[];
  approvalGate?: boolean;
}

export interface PromptBuildContext {
  actor: PromptBuildContextActor;
  tenant: PromptBuildContextTenant;
  session: PromptBuildContextSession;
  policy: PromptBuildContextPolicy;
  run: PromptBuildContextRun;
  adapters: AdapterInfo[];
  memory?: MemoryContext;
  verification?: VerificationContext;
  mode?: PromptMode;
}

// ─── Built Artifact ───────────────────────────────────────────────────────────

export interface BuiltPromptArtifact {
  promptId: string;
  version: string;
  compiledPrompt: string;
  fingerprint: string;
  manifest: PromptManifest;
  contextSummary: {
    actorId: string;
    orgId: string;
    workspaceId: string;
    projectId: string;
    runId: string;
    correlationId: string;
    authMode: string;
    mode: PromptMode;
    channel: PromptChannel;
    restrictedCapabilities: string[];
    approvalRequired: boolean;
  };
}

// ─── Registry Types ───────────────────────────────────────────────────────────

export interface PromptRegistryEntry {
  promptId: string;
  activeVersion: string;
  availableVersions: string[];
  channel: PromptChannel;
  status: PromptStatus;
  lastUpdated: string;
}

export interface PromptRegistry {
  schemaVersion: string;
  lastModified: string;
  prompts: PromptRegistryEntry[];
}
