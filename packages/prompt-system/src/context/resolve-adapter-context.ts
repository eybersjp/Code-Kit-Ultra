import type { AdapterInfo } from '../contracts.js';

/**
 * Resolves a raw array of adapter descriptors into a typed AdapterInfo array.
 *
 * Each adapter entry must have a `name` string, an `available` boolean, and a
 * `capabilities` array. Entries missing required fields are filtered out with
 * a warning-friendly no-op (callers can log if needed). An empty array is
 * returned safely when the input is absent or empty.
 *
 * @param raw  Unvalidated adapter data, typically provided by the orchestrator.
 * @returns    Array of typed AdapterInfo objects ready for PromptBuildContext.
 */
export function resolveAdapterContext(
  raw: Array<{ name: string; available: boolean; capabilities: string[] }>,
): AdapterInfo[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const adapters: AdapterInfo[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;

    const name =
      typeof entry.name === 'string' && entry.name.trim() !== ''
        ? entry.name.trim()
        : null;

    if (name === null) continue;

    const available =
      typeof entry.available === 'boolean' ? entry.available : false;

    const capabilities = Array.isArray(entry.capabilities)
      ? entry.capabilities.filter(
          (c): c is string => typeof c === 'string' && c.trim() !== '',
        )
      : [];

    adapters.push({ name, available, capabilities });
  }

  return adapters;
}
