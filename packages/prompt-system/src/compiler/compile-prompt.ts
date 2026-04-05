import type { PromptManifest, PromptBuildContext, BuiltPromptArtifact, PromptMode } from '../contracts.js';
import { renderTemplate } from './render-template.js';
import { computePromptFingerprint } from './fingerprint.js';

/**
 * Validates that all blocks declared as `required_context_blocks` in the
 * manifest are present and non-empty in either the partials map or the
 * context's run/policy data.
 *
 * Throws a descriptive error if any required block is absent.
 */
function assertRequiredBlocks(
  manifest: PromptManifest,
  partials: Record<string, string>,
): void {
  const missing: string[] = [];

  for (const block of manifest.required_context_blocks) {
    if (typeof partials[block] !== 'string' || partials[block].trim() === '') {
      missing.push(block);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `compilePrompt: missing required context blocks for prompt "${manifest.id}@${manifest.version}": [${missing.join(', ')}]`,
    );
  }
}

/**
 * Derives the effective PromptMode from the build context.
 * Falls back to 'safe' when no mode is specified.
 */
function resolveMode(context: PromptBuildContext): PromptMode {
  return context.mode ?? 'safe';
}

/**
 * Compiles a fully-rendered BuiltPromptArtifact from a manifest, template
 * source string, build context, and a map of pre-loaded partial strings.
 *
 * Steps performed:
 *  1. Validates that all required context blocks are present in `partials`.
 *  2. Renders the Handlebars template against the build context.
 *  3. Computes a deterministic SHA-256 fingerprint over the compiled output.
 *  4. Assembles and returns the BuiltPromptArtifact.
 *
 * @param manifest        Validated PromptManifest for this prompt version.
 * @param templateSource  Raw Handlebars template string (system.md content).
 * @param context         Fully-resolved PromptBuildContext.
 * @param partials        Map of partial name → partial content strings.
 * @returns               Immutable BuiltPromptArtifact ready for use or audit.
 */
export function compilePrompt(
  manifest: PromptManifest,
  templateSource: string,
  context: PromptBuildContext,
  partials: Record<string, string>,
): BuiltPromptArtifact {
  // Step 1 – Validate required context blocks
  assertRequiredBlocks(manifest, partials);

  // Step 2 – Render the Handlebars template
  const compiledPrompt = renderTemplate(templateSource, context, partials);

  // Step 3 – Compute fingerprint
  const fingerprint = computePromptFingerprint(
    manifest.id,
    manifest.version,
    compiledPrompt,
    context,
  );

  const mode = resolveMode(context);

  // Step 4 – Assemble artifact
  const artifact: BuiltPromptArtifact = {
    promptId: manifest.id,
    version: manifest.version,
    compiledPrompt,
    fingerprint,
    manifest,
    contextSummary: {
      actorId: context.actor.actorId,
      orgId: context.tenant.orgId,
      workspaceId: context.tenant.workspaceId,
      projectId: context.tenant.projectId,
      runId: context.run.runId,
      correlationId: context.run.correlationId,
      authMode: context.session.authMode,
      mode,
      channel: manifest.channel,
      restrictedCapabilities: [...context.policy.restrictedCapabilities],
      approvalRequired: context.policy.approvalRequired,
    },
  };

  return artifact;
}
