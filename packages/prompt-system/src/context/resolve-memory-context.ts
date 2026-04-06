import type { MemoryContext } from '../contracts.js';

/**
 * Resolves an optional raw memory input into a typed MemoryContext.
 *
 * Returns `undefined` when no raw input is provided, signalling to the caller
 * that there is no prior memory available for this run. When input is provided,
 * all three array fields default to empty arrays if absent.
 *
 * @param raw  Optional partial memory data from a prior run or memory store.
 * @returns    Typed MemoryContext, or `undefined` if no data was supplied.
 */
export function resolveMemoryContext(raw?: {
  recentFailures?: string[];
  successfulPatterns?: string[];
  rejectedApproaches?: string[];
}): MemoryContext | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  return {
    recentFailures: Array.isArray(raw.recentFailures)
      ? [...raw.recentFailures]
      : [],
    successfulPatterns: Array.isArray(raw.successfulPatterns)
      ? [...raw.successfulPatterns]
      : [],
    rejectedApproaches: Array.isArray(raw.rejectedApproaches)
      ? [...raw.rejectedApproaches]
      : [],
  };
}
