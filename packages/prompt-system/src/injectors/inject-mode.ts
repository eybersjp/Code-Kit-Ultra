import type { PromptMode } from '../contracts.js';

/**
 * Returns the partial path key for the given PromptMode.
 *
 * Each mode maps to a dedicated partial file under `prompts/partials/modes/`:
 *  - `'safe'`     → `'modes/safe'`
 *  - `'balanced'` → `'modes/balanced'`
 *  - `'god'`      → `'modes/god'`
 *
 * The returned string is a partial path key that must be present in the
 * partials map passed to `renderTemplate` / `compilePrompt`.
 *
 * @param mode  The resolved PromptMode for this run.
 * @returns     Partial path string.
 * @throws      Error if an unrecognised mode is supplied.
 */
export function injectModeBlock(mode: PromptMode): string {
  switch (mode) {
    case 'safe':
      return 'modes/safe';
    case 'balanced':
      return 'modes/balanced';
    case 'god':
      return 'modes/god';
    default: {
      // TypeScript exhaustiveness guard – should never be reached at runtime.
      const _exhaustive: never = mode;
      throw new Error(
        `injectModeBlock: unrecognised mode "${String(_exhaustive)}"`,
      );
    }
  }
}
