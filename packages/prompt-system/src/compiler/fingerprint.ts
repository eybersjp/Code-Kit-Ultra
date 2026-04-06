import { createHash } from 'node:crypto';
import type { PromptBuildContext } from '../contracts.js';

/**
 * Computes a deterministic SHA-256 fingerprint for a compiled prompt artifact.
 *
 * The fingerprint is derived from:
 *  - promptId + version (identity)
 *  - compiledPrompt (content)
 *  - key context fields that affect runtime behaviour (actor, tenant, session,
 *    run, policy risk threshold and approval flag)
 *
 * This fingerprint can be used for cache keying, audit logging, and snapshot
 * regression comparisons.
 *
 * @param promptId        The prompt identifier.
 * @param version         The prompt version string.
 * @param compiledPrompt  The fully-rendered prompt text.
 * @param context         The build context used during compilation.
 * @returns               Hex-encoded SHA-256 digest.
 */
export function computePromptFingerprint(
  promptId: string,
  version: string,
  compiledPrompt: string,
  context: PromptBuildContext,
): string {
  const fingerprintPayload = {
    promptId,
    version,
    compiledPrompt,
    actor: {
      actorId: context.actor.actorId,
    },
    tenant: {
      orgId: context.tenant.orgId,
      workspaceId: context.tenant.workspaceId,
      projectId: context.tenant.projectId,
    },
    session: {
      authMode: context.session.authMode,
      roles: [...context.session.roles].sort(),
    },
    run: {
      runId: context.run.runId,
      correlationId: context.run.correlationId,
      goal: context.run.goal,
    },
    policy: {
      riskThreshold: context.policy.riskThreshold,
      approvalRequired: context.policy.approvalRequired,
    },
  };

  const serialised = JSON.stringify(fingerprintPayload, null, 0);

  return createHash('sha256').update(serialised, 'utf-8').digest('hex');
}
