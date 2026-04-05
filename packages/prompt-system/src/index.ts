// ─── Contracts (core types) ───────────────────────────────────────────────────
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

// ─── Types (internal + re-exports) ────────────────────────────────────────────
export type {
  ContextBlock,
  RawSessionInput,
  RawTenantInput,
  RawPolicyInput,
  RawRunInput,
  RawMemoryInput,
  RawAdapterInput,
  CapabilityEvaluationResult,
  AuditExecutionResult,
} from './types.js';

// ─── Registry ─────────────────────────────────────────────────────────────────
export { PromptRegistryService, promptRegistry } from './registry/prompt-registry.js';
export { PromptLoader, promptLoader } from './registry/prompt-loader.js';
export { validateManifest } from './registry/manifest-validator.js';

// ─── Compiler ─────────────────────────────────────────────────────────────────
export { compilePrompt } from './compiler/compile-prompt.js';
export { computePromptFingerprint } from './compiler/fingerprint.js';
export { renderTemplate } from './compiler/render-template.js';
export { mergeContextBlocks } from './compiler/merge-blocks.js';

// ─── Context resolvers ────────────────────────────────────────────────────────
export { resolveSessionContext } from './context/resolve-session-context.js';
export { resolveTenantContext } from './context/resolve-tenant-context.js';
export { resolvePolicyContext } from './context/resolve-policy-context.js';
export { resolveRunContext } from './context/resolve-run-context.js';
export { resolveMemoryContext } from './context/resolve-memory-context.js';
export { resolveAdapterContext } from './context/resolve-adapter-context.js';

// ─── Injectors ────────────────────────────────────────────────────────────────
export { injectPolicyBlock } from './injectors/inject-policy.js';
export { injectInsForgeBlock } from './injectors/inject-insforge.js';
export { injectModeBlock } from './injectors/inject-mode.js';
export { injectSafetyConstraints } from './injectors/inject-safety.js';
export { injectExecutionState } from './injectors/inject-execution-state.js';

// ─── Runtime ──────────────────────────────────────────────────────────────────
export { PromptRuntime, promptRuntime } from './runtime/build-runtime-prompt.js';
export { selectPrompt } from './runtime/select-prompt.js';
export { evaluateCapabilities } from './runtime/evaluate-capabilities.js';

// ─── Audit ────────────────────────────────────────────────────────────────────
export { writePromptAudit } from './audit/write-prompt-audit.js';
export type { AuditExecutionResult as PromptAuditExecutionResult } from './audit/write-prompt-audit.js';

// ─── Testing utilities ────────────────────────────────────────────────────────
export { snapshotPrompt } from './testing/snapshot-prompt.js';
export { validateOutputSchema } from './testing/validate-output.js';
