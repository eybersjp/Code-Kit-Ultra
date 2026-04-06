import type { PromptManifest, PromptBuildContext } from '../contracts.js';

/**
 * Derives an ordered list of human-readable safety constraint strings that
 * should be injected into the compiled prompt at runtime.
 *
 * Sources of constraints (applied in priority order):
 *  1. Manifest `policy_binding` enforcement level
 *  2. Context `policy.riskThreshold` value
 *  3. Context `policy.approvalRequired` flag
 *  4. Context `policy.restrictedCapabilities` list
 *  5. Manifest `capabilities` that overlap with context restricted list
 *  6. Context `verification` settings (when approval gate is active)
 *
 * @param manifest  The validated PromptManifest for this prompt.
 * @param context   The fully-resolved PromptBuildContext.
 * @returns         Array of constraint description strings (may be empty).
 */
export function injectSafetyConstraints(
  manifest: PromptManifest,
  context: PromptBuildContext,
): string[] {
  const constraints: string[] = [];

  // ── 1. Policy binding enforcement level ───────────────────────────────────
  if (manifest.policy_binding) {
    const { policyId, enforcementLevel } = manifest.policy_binding;
    switch (enforcementLevel) {
      case 'blocking':
        constraints.push(
          `[BLOCKING] Policy "${policyId}" is enforced in blocking mode – violations will halt execution.`,
        );
        break;
      case 'advisory':
        constraints.push(
          `[ADVISORY] Policy "${policyId}" is enforced in advisory mode – violations will be flagged but will not halt execution.`,
        );
        break;
      case 'audit-only':
        constraints.push(
          `[AUDIT-ONLY] Policy "${policyId}" is enforced in audit-only mode – all actions are logged for compliance review.`,
        );
        break;
    }
  }

  // ── 2. Risk threshold ─────────────────────────────────────────────────────
  const riskThreshold = context.policy.riskThreshold;
  if (riskThreshold === 'critical') {
    constraints.push(
      'CRITICAL risk threshold is active. All destructive or irreversible actions require explicit confirmation.',
    );
  } else if (riskThreshold === 'high') {
    constraints.push(
      'HIGH risk threshold is active. Actions with significant side-effects must be validated before execution.',
    );
  }

  // ── 3. Approval required flag ─────────────────────────────────────────────
  if (context.policy.approvalRequired) {
    constraints.push(
      'APPROVAL REQUIRED: A human approval gate must be passed before any output is acted upon.',
    );
  }

  // ── 4. Restricted capabilities ────────────────────────────────────────────
  if (context.policy.restrictedCapabilities.length > 0) {
    const restricted = context.policy.restrictedCapabilities.join(', ');
    constraints.push(
      `The following capabilities are restricted in this context and MUST NOT be used: [${restricted}].`,
    );
  }

  // ── 5. Manifest capabilities that overlap with restricted list ────────────
  const overlap = manifest.capabilities.filter((cap) =>
    context.policy.restrictedCapabilities.includes(cap),
  );
  if (overlap.length > 0) {
    constraints.push(
      `WARNING: This prompt declares capabilities [${overlap.join(', ')}] that are currently restricted. ` +
        'These capabilities will not be available during this run.',
    );
  }

  // ── 6. Verification / approval gate ──────────────────────────────────────
  if (context.verification?.approvalGate === true) {
    const signoffs =
      context.verification.requiredSignoffs &&
      context.verification.requiredSignoffs.length > 0
        ? ` Required signoffs: [${context.verification.requiredSignoffs.join(', ')}].`
        : '';
    constraints.push(
      `VERIFICATION GATE is active. All outputs must pass approval before downstream use.${signoffs}`,
    );
  }

  return constraints;
}
