import type { PromptMode, PromptManifest } from '../contracts.js';

/**
 * Validates that the requested mode is supported by the manifest and returns a
 * prompt selection descriptor.
 *
 * The manifest's `supported_modes` array is authoritative. If the desired mode
 * is not listed, an error is thrown with a clear explanation of which modes are
 * available for the given prompt.
 *
 * @param promptId  The prompt identifier being selected.
 * @param mode      The desired PromptMode for this run.
 * @param manifest  The validated PromptManifest for the active version.
 * @returns         An object with the resolved `promptId` and `version`.
 * @throws          Error if the requested mode is not supported.
 */
export function selectPrompt(
  promptId: string,
  mode: PromptMode,
  manifest: PromptManifest,
): { promptId: string; version: string } {
  const supported = manifest.supported_modes;

  if (!supported.includes(mode)) {
    throw new Error(
      `selectPrompt: mode "${mode}" is not supported by prompt "${promptId}@${manifest.version}". ` +
        `Supported modes: [${supported.join(', ')}].`,
    );
  }

  return {
    promptId,
    version: manifest.version,
  };
}
