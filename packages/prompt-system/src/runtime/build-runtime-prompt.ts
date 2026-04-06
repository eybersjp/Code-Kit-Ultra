import { logger } from '../../../shared/src/logger.js';
import type { PromptBuildContext, BuiltPromptArtifact, PromptMode } from '../contracts.js';
import { promptRegistry } from '../registry/prompt-registry.js';
import { promptLoader } from '../registry/prompt-loader.js';
import { validateManifest } from '../registry/manifest-validator.js';
import { selectPrompt } from './select-prompt.js';
import { evaluateCapabilities } from './evaluate-capabilities.js';
import { compilePrompt } from '../compiler/compile-prompt.js';
import { injectPolicyBlock } from '../injectors/inject-policy.js';
import { injectInsForgeBlock } from '../injectors/inject-insforge.js';
import { injectModeBlock } from '../injectors/inject-mode.js';
import { writePromptAudit } from '../audit/write-prompt-audit.js';

/**
 * The set of partials that are always pre-loaded for every prompt build,
 * regardless of what the manifest declares. These cover the standard
 * policy, InsForge, and mode blocks.
 */
const STANDARD_PARTIAL_KEYS = [
  'policy/default-policy',
  'policy/high-risk-policy',
  'insforge/tenant-session',
  'insforge/machine-execution',
  'modes/safe',
  'modes/balanced',
  'modes/god',
] as const;

/**
 * PromptRuntime is the main entry point for building a compiled prompt
 * artifact from a prompt ID and a fully-resolved PromptBuildContext.
 *
 * It orchestrates the full lifecycle:
 *  1. Registry lookup (active version)
 *  2. Manifest load + validation
 *  3. Mode compatibility check
 *  4. Capability constraint evaluation
 *  5. Template + partial loading
 *  6. Compilation (Handlebars render + fingerprint)
 *  7. Audit logging
 */
class PromptRuntime {
  /**
   * Builds a compiled BuiltPromptArtifact for the given prompt ID and context.
   *
   * @param promptId  The prompt identifier to build.
   * @param context   The fully-resolved PromptBuildContext for this run.
   * @returns         The compiled and fingerprinted BuiltPromptArtifact.
   * @throws          Error at any validation step (mode, capabilities, missing partials, etc.)
   */
  public async build(
    promptId: string,
    context: PromptBuildContext,
  ): Promise<BuiltPromptArtifact> {
    const mode: PromptMode = context.mode ?? 'safe';

    logger.info(
      { promptId, mode, runId: context.run.runId },
      'PromptRuntime.build: starting prompt compilation',
    );

    // Step 1 – Resolve active version from registry
    const version = await promptRegistry.getActiveVersion(promptId);
    logger.debug({ promptId, version }, 'Resolved active version');

    // Step 2 – Load and validate manifest
    const rawManifest = await promptLoader.loadManifest(promptId, version);
    const manifest = validateManifest(rawManifest);
    logger.debug({ promptId, version }, 'Manifest loaded and validated');

    // Step 3 – Validate mode is supported
    selectPrompt(promptId, mode, manifest);
    logger.debug({ promptId, version, mode }, 'Mode validated');

    // Step 4 – Check capability constraints
    const capResult = evaluateCapabilities(manifest, context);
    if (!capResult.allowed) {
      throw new Error(
        `PromptRuntime.build: prompt "${promptId}@${version}" has restricted capabilities [${capResult.restricted.join(', ')}] ` +
          'that are blocked by the current policy context.',
      );
    }
    if (capResult.missing.length > 0) {
      logger.warn(
        { promptId, version, missingCapabilities: capResult.missing },
        'Some manifest capabilities are not in the allowed adapters list',
      );
    }

    // Step 5 – Load template and partials
    const templateSource = await promptLoader.loadTemplate(promptId, version);

    // Determine which partials to load: standard set + manifest-declared blocks
    const partialKeysToLoad = new Set<string>([
      ...STANDARD_PARTIAL_KEYS,
      ...manifest.allowed_context_blocks,
      ...manifest.required_context_blocks,
    ]);

    // Dynamically selected partials based on context
    partialKeysToLoad.add(injectPolicyBlock(context));
    partialKeysToLoad.add(injectInsForgeBlock(context));
    partialKeysToLoad.add(injectModeBlock(mode));

    const partials: Record<string, string> = {};

    await Promise.all(
      Array.from(partialKeysToLoad).map(async (key) => {
        try {
          partials[key] = await promptLoader.loadPartial(key);
        } catch (err) {
          // Non-fatal for optional blocks; required blocks will fail in compilePrompt
          const message = err instanceof Error ? err.message : String(err);
          logger.warn({ partialKey: key, error: message }, 'Failed to load partial – skipping');
        }
      }),
    );

    logger.debug(
      { promptId, version, partialsLoaded: Object.keys(partials).length },
      'Partials loaded',
    );

    // Step 6 – Compile prompt
    const artifact = compilePrompt(manifest, templateSource, context, partials);

    logger.info(
      {
        promptId,
        version,
        fingerprint: artifact.fingerprint,
        runId: context.run.runId,
      },
      'PromptRuntime.build: prompt compiled successfully',
    );

    // Step 7 – Write audit log
    writePromptAudit(artifact);

    return artifact;
  }
}

export { PromptRuntime };

/** Singleton instance shared across the process. */
export const promptRuntime = new PromptRuntime();
