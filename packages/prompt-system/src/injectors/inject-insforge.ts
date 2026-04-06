import type { PromptBuildContext } from '../contracts.js';

/**
 * Returns the partial name for the InsForge audit/observation block, selected
 * based on the session's authentication mode.
 *
 * Mapping:
 *  - `'session'`         → human-initiated run → `'insforge/tenant-session'`
 *  - `'legacy-dev'`      → developer session    → `'insforge/tenant-session'`
 *  - `'service-account'` → machine execution    → `'insforge/machine-execution'`
 *
 * The returned string is a partial path key that must be present in the
 * partials map passed to `renderTemplate` / `compilePrompt`.
 *
 * @param context  The fully-resolved PromptBuildContext.
 * @returns        Partial path string for the InsForge block.
 */
export function injectInsForgeBlock(context: PromptBuildContext): string {
  if (context.session.authMode === 'service-account') {
    return 'insforge/machine-execution';
  }

  // 'session' and 'legacy-dev' are treated as human/tenant-initiated
  return 'insforge/tenant-session';
}
