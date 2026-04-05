import type { PromptBuildContextPolicy } from '../contracts.js';

/**
 * Resolves a raw policy input into a typed PromptBuildContextPolicy, applying
 * safe defaults for any fields that are absent or undefined.
 *
 * Defaults:
 *  - `riskThreshold`          → `'medium'`
 *  - `approvalRequired`       → `false`
 *  - `restrictedCapabilities` → `[]`
 *  - `allowedAdapters`        → `[]`
 *
 * @param raw  Partial or undefined policy data from the upstream request.
 * @returns    Fully-populated policy sub-object for inclusion in PromptBuildContext.
 */
export function resolvePolicyContext(raw?: {
  riskThreshold?: string;
  approvalRequired?: boolean;
  restrictedCapabilities?: string[];
  allowedAdapters?: string[];
}): PromptBuildContextPolicy {
  return {
    riskThreshold:
      typeof raw?.riskThreshold === 'string' && raw.riskThreshold.trim() !== ''
        ? raw.riskThreshold.trim()
        : 'medium',
    approvalRequired:
      typeof raw?.approvalRequired === 'boolean' ? raw.approvalRequired : false,
    restrictedCapabilities: Array.isArray(raw?.restrictedCapabilities)
      ? [...raw.restrictedCapabilities]
      : [],
    allowedAdapters: Array.isArray(raw?.allowedAdapters)
      ? [...raw.allowedAdapters]
      : [],
  };
}
