import { logger } from '../../../shared/src/logger.js';
import type { BuiltPromptArtifact } from '../contracts.js';

/**
 * Optional execution result that may accompany an audit entry once the model
 * response has been evaluated.
 */
export interface AuditExecutionResult {
  /** Human-readable outcome label, e.g. `'success'`, `'schema-invalid'`, `'gate-rejected'`. */
  outcome: string;
  /** Whether the model output passed JSON-schema validation. */
  schemaValid: boolean;
  /** Whether a human approval gate was triggered for this run. */
  gateRequired: boolean;
}

/**
 * Writes a structured audit log entry for a compiled prompt artifact.
 *
 * The entry captures all fields required for governance, compliance, and
 * security review: identity (actor, tenant, project), execution metadata
 * (run ID, correlation ID), policy state (risk threshold, restricted
 * capabilities, approval gate), and the content fingerprint.
 *
 * When an `executionResult` is provided (typically after the model responds),
 * the outcome, schema validity, and gate status are also recorded.
 *
 * @param artifact         The compiled BuiltPromptArtifact.
 * @param executionResult  Optional execution outcome metadata.
 */
export function writePromptAudit(
  artifact: BuiltPromptArtifact,
  executionResult?: AuditExecutionResult,
): void {
  const {
    promptId,
    version,
    fingerprint,
    manifest,
    contextSummary,
  } = artifact;

  const auditPayload: Record<string, unknown> = {
    // ── Identity ──────────────────────────────────────────────────────────
    promptId,
    version,
    channel: contextSummary.channel,
    fingerprint,

    // ── Actor / tenant ────────────────────────────────────────────────────
    actorId: contextSummary.actorId,
    orgId: contextSummary.orgId,
    workspaceId: contextSummary.workspaceId,
    projectId: contextSummary.projectId,

    // ── Session ───────────────────────────────────────────────────────────
    authMode: contextSummary.authMode,

    // ── Mode ──────────────────────────────────────────────────────────────
    mode: contextSummary.mode,

    // ── Run / trace ───────────────────────────────────────────────────────
    runId: contextSummary.runId,
    correlationId: contextSummary.correlationId,

    // ── Policy ────────────────────────────────────────────────────────────
    restrictedCapabilities: contextSummary.restrictedCapabilities,
    approvalRequired: contextSummary.approvalRequired,

    // ── Manifest metadata ─────────────────────────────────────────────────
    manifestStatus: manifest.status,
    policyBindingId: manifest.policy_binding?.policyId ?? null,
    insforgeBindingId: manifest.insforge_binding?.bindingId ?? null,
  };

  if (executionResult !== undefined) {
    auditPayload['outcome'] = executionResult.outcome;
    auditPayload['schemaValid'] = executionResult.schemaValid;
    auditPayload['gateRequired'] = executionResult.gateRequired;
  }

  logger.info(auditPayload, 'PROMPT_AUDIT');
}
