import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { BuiltPromptArtifact } from '../contracts.js';

/**
 * Writes the compiled prompt from a BuiltPromptArtifact to a Markdown snapshot
 * file for regression testing and human review.
 *
 * The output file is named using the pattern:
 *   `{snapshotDir}/{promptId}-{version}-{mode}.md`
 *
 * The file contents include a YAML-style front-matter header with key artifact
 * metadata followed by the full compiled prompt text.
 *
 * @param artifact     The compiled BuiltPromptArtifact to snapshot.
 * @param snapshotDir  Absolute or relative path to the directory where
 *                     snapshots should be written. The directory is created
 *                     (recursively) if it does not already exist.
 * @returns            Promise that resolves when the file has been written.
 */
export async function snapshotPrompt(
  artifact: BuiltPromptArtifact,
  snapshotDir: string,
): Promise<void> {
  const { promptId, version, compiledPrompt, fingerprint, contextSummary, manifest } =
    artifact;

  const mode = contextSummary.mode;
  const filename = `${promptId}-${version}-${mode}.md`;
  const filePath = path.resolve(snapshotDir, filename);

  // Ensure the snapshot directory exists
  await mkdir(path.resolve(snapshotDir), { recursive: true });

  const now = new Date().toISOString();

  const header = [
    '---',
    `promptId: ${promptId}`,
    `version: ${version}`,
    `mode: ${mode}`,
    `channel: ${manifest.channel}`,
    `status: ${manifest.status}`,
    `fingerprint: ${fingerprint}`,
    `actorId: ${contextSummary.actorId}`,
    `orgId: ${contextSummary.orgId}`,
    `workspaceId: ${contextSummary.workspaceId}`,
    `projectId: ${contextSummary.projectId}`,
    `runId: ${contextSummary.runId}`,
    `correlationId: ${contextSummary.correlationId}`,
    `authMode: ${contextSummary.authMode}`,
    `approvalRequired: ${contextSummary.approvalRequired}`,
    `snapshotAt: ${now}`,
    '---',
    '',
  ].join('\n');

  await writeFile(filePath, header + compiledPrompt, 'utf-8');
}
