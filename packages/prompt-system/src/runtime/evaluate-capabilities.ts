import type { PromptManifest, PromptBuildContext } from '../contracts.js';

/**
 * Result shape returned by `evaluateCapabilities`.
 */
export interface CapabilityEvaluationResult {
  /** `true` if no manifest capabilities are restricted by the policy context. */
  allowed: boolean;
  /**
   * Capabilities declared in the manifest that are absent from the context's
   * allowed-adapters list (informational; does not block execution by itself).
   */
  missing: string[];
  /**
   * Manifest capabilities that appear in `context.policy.restrictedCapabilities`.
   * When non-empty, `allowed` is `false`.
   */
  restricted: string[];
}

/**
 * Evaluates whether the manifest's declared capabilities are compatible with
 * the current policy context.
 *
 * A capability is considered *restricted* if it appears in both
 * `manifest.capabilities` and `context.policy.restrictedCapabilities`.
 * Any restricted capability causes `allowed` to be `false`.
 *
 * A capability is considered *missing* if it is declared by the manifest but
 * not present in `context.policy.allowedAdapters`. This is informational only
 * and does not affect the `allowed` flag.
 *
 * @param manifest  The validated PromptManifest for this prompt version.
 * @param context   The fully-resolved PromptBuildContext.
 * @returns         A CapabilityEvaluationResult describing the outcome.
 */
export function evaluateCapabilities(
  manifest: PromptManifest,
  context: PromptBuildContext,
): CapabilityEvaluationResult {
  const restrictedSet = new Set(context.policy.restrictedCapabilities);
  const allowedAdapterSet = new Set(context.policy.allowedAdapters);

  const restricted: string[] = [];
  const missing: string[] = [];

  for (const cap of manifest.capabilities) {
    if (restrictedSet.has(cap)) {
      restricted.push(cap);
    }
    // Only flag as missing when there is an explicit allowedAdapters list
    if (allowedAdapterSet.size > 0 && !allowedAdapterSet.has(cap)) {
      missing.push(cap);
    }
  }

  return {
    allowed: restricted.length === 0,
    missing,
    restricted,
  };
}
