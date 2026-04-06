import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../../shared/src/logger.js';
import type { PromptManifest } from '../contracts.js';

/**
 * Resolves a path relative to the workspace root (process.cwd()).
 */
function workspacePath(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

class PromptLoader {
  /**
   * Reads and parses the manifest.json for a given prompt ID + version from:
   *   prompts/templates/system/{promptId}/{version}/manifest.json
   */
  public async loadManifest(
    promptId: string,
    version: string,
  ): Promise<PromptManifest> {
    const filePath = workspacePath(
      'prompts',
      'templates',
      'system',
      promptId,
      version,
      'manifest.json',
    );

    logger.debug({ promptId, version, filePath }, 'Loading prompt manifest');

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ promptId, version, filePath, error: message }, 'Failed to read manifest');
      throw new Error(
        `PromptLoader: cannot read manifest for "${promptId}@${version}" at "${filePath}": ${message}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PromptLoader: manifest JSON is malformed for "${promptId}@${version}": ${message}`,
      );
    }

    logger.debug({ promptId, version }, 'Manifest loaded successfully');
    return parsed as PromptManifest;
  }

  /**
   * Reads the system.md template file for a given prompt ID + version from:
   *   prompts/templates/system/{promptId}/{version}/system.md
   */
  public async loadTemplate(promptId: string, version: string): Promise<string> {
    const filePath = workspacePath(
      'prompts',
      'templates',
      'system',
      promptId,
      version,
      'system.md',
    );

    logger.debug({ promptId, version, filePath }, 'Loading prompt template');

    try {
      const content = await readFile(filePath, 'utf-8');
      logger.debug({ promptId, version, bytes: content.length }, 'Template loaded');
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ promptId, version, filePath, error: message }, 'Failed to read template');
      throw new Error(
        `PromptLoader: cannot read template for "${promptId}@${version}" at "${filePath}": ${message}`,
      );
    }
  }

  /**
   * Reads and parses the output-schema.json for a given prompt ID + version from:
   *   prompts/templates/system/{promptId}/{version}/output-schema.json
   */
  public async loadOutputSchema(promptId: string, version: string): Promise<object> {
    const filePath = workspacePath(
      'prompts',
      'templates',
      'system',
      promptId,
      version,
      'output-schema.json',
    );

    logger.debug({ promptId, version, filePath }, 'Loading output schema');

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ promptId, version, filePath, error: message }, 'Failed to read output schema');
      throw new Error(
        `PromptLoader: cannot read output schema for "${promptId}@${version}" at "${filePath}": ${message}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PromptLoader: output schema JSON is malformed for "${promptId}@${version}": ${message}`,
      );
    }

    return parsed as object;
  }

  /**
   * Reads a partial template file from:
   *   prompts/partials/{partialPath}
   *
   * The partialPath may include subdirectory segments, e.g. "policy/default-policy.md".
   */
  public async loadPartial(partialPath: string): Promise<string> {
    // Ensure we don't double-append extensions when callers pass a bare path
    const resolvedPath = partialPath.endsWith('.md')
      ? partialPath
      : `${partialPath}.md`;

    const filePath = workspacePath('prompts', 'partials', resolvedPath);

    logger.debug({ partialPath, filePath }, 'Loading prompt partial');

    try {
      const content = await readFile(filePath, 'utf-8');
      logger.debug({ partialPath, bytes: content.length }, 'Partial loaded');
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ partialPath, filePath, error: message }, 'Failed to read partial');
      throw new Error(
        `PromptLoader: cannot read partial "${partialPath}" at "${filePath}": ${message}`,
      );
    }
  }
}

export { PromptLoader };

/** Singleton instance shared across the process. */
export const promptLoader = new PromptLoader();
