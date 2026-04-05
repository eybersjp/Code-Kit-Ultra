import type { PromptBuildContext } from '../contracts.js';

/**
 * Returns the partial name that should be used to render the policy block for
 * the given build context.
 *
 * The selection logic is:
 *  - If the context policy's `riskThreshold` is `'critical'` OR
 *    `approvalRequired` is `true`, return the high-risk policy partial.
 *  - Otherwise return the default (normal) policy partial.
 *
 * The returned string is a partial path key that must exist in the partials map
 * passed to `renderTemplate` / `compilePrompt`.
 *
 * @param context  The fully-resolved PromptBuildContext.
 * @returns        Partial path string: `'policy/default-policy'` or
 *                 `'policy/high-risk-policy'`.
 */
export function injectPolicyBlock(context: PromptBuildContext): string {
  const isHighRisk =
    context.policy.riskThreshold === 'critical' ||
    context.policy.approvalRequired === true;

  return isHighRisk ? 'policy/high-risk-policy' : 'policy/default-policy';
}
