import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../../shared/src/logger.js';
import type { PromptRegistry, PromptRegistryEntry } from '../contracts.js';

const REGISTRY_PATH = path.resolve(
  process.cwd(),
  'prompts/registry/prompt-registry.json',
);

class PromptRegistryService {
  private cache: PromptRegistry | null = null;

  /**
   * Loads the registry JSON from disk, caching it after the first successful
   * read so that repeated calls in the same process avoid redundant I/O.
   */
  private async loadRegistry(): Promise<PromptRegistry> {
    if (this.cache !== null) {
      return this.cache;
    }

    logger.debug({ path: REGISTRY_PATH }, 'Loading prompt registry');

    let raw: string;
    try {
      raw = await readFile(REGISTRY_PATH, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ path: REGISTRY_PATH, error: message }, 'Failed to read prompt registry file');
      throw new Error(`PromptRegistryService: cannot read registry at "${REGISTRY_PATH}": ${message}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ path: REGISTRY_PATH, error: message }, 'Prompt registry file is not valid JSON');
      throw new Error(`PromptRegistryService: registry JSON is malformed: ${message}`);
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>)['prompts'])
    ) {
      throw new Error(
        'PromptRegistryService: registry file must be an object with a "prompts" array',
      );
    }

    this.cache = parsed as PromptRegistry;
    logger.info(
      { promptCount: this.cache.prompts.length },
      'Prompt registry loaded and cached',
    );
    return this.cache;
  }

  /**
   * Invalidates the in-memory cache so the registry is re-read from disk on
   * the next access. Useful during testing or when the registry file changes.
   */
  public invalidateCache(): void {
    this.cache = null;
    logger.debug('Prompt registry cache invalidated');
  }

  /**
   * Returns the active version string for a given prompt ID.
   *
   * @throws if the prompt ID is not found in the registry.
   */
  public async getActiveVersion(promptId: string): Promise<string> {
    const registry = await this.loadRegistry();
    const entry = registry.prompts.find((p) => p.promptId === promptId);
    if (!entry) {
      throw new Error(
        `PromptRegistryService: no registry entry found for promptId "${promptId}"`,
      );
    }
    return entry.activeVersion;
  }

  /**
   * Returns every prompt ID currently present in the registry.
   */
  public async getAllPromptIds(): Promise<string[]> {
    const registry = await this.loadRegistry();
    return registry.prompts.map((p) => p.promptId);
  }

  /**
   * Returns the full registry entry for a given prompt ID.
   *
   * @throws if the prompt ID is not found in the registry.
   */
  public async getRegistryEntry(promptId: string): Promise<PromptRegistryEntry> {
    const registry = await this.loadRegistry();
    const entry = registry.prompts.find((p) => p.promptId === promptId);
    if (!entry) {
      throw new Error(
        `PromptRegistryService: no registry entry found for promptId "${promptId}"`,
      );
    }
    return entry;
  }
}

export { PromptRegistryService };

/** Singleton instance shared across the process. */
export const promptRegistry = new PromptRegistryService();
