import type { PromptBuildContextSession } from '../contracts.js';

const VALID_AUTH_MODES = ['session', 'service-account', 'legacy-dev'] as const;
type ValidAuthMode = (typeof VALID_AUTH_MODES)[number];

/**
 * Resolves and validates a raw session input object into a typed
 * PromptBuildContextSession.
 *
 * @param rawSession  Unvalidated session data, typically sourced from a JWT
 *                    claim or an upstream auth token.
 * @returns           Typed session sub-object for inclusion in PromptBuildContext.
 * @throws            Error if `authMode` is not one of the recognised values.
 */
export function resolveSessionContext(rawSession: {
  authMode: string;
  permissions: string[];
  roles: string[];
}): PromptBuildContextSession {
  if (!VALID_AUTH_MODES.includes(rawSession.authMode as ValidAuthMode)) {
    throw new Error(
      `resolveSessionContext: invalid authMode "${rawSession.authMode}". ` +
        `Must be one of [${VALID_AUTH_MODES.join(', ')}].`,
    );
  }

  return {
    authMode: rawSession.authMode as ValidAuthMode,
    permissions: Array.isArray(rawSession.permissions)
      ? [...rawSession.permissions]
      : [],
    roles: Array.isArray(rawSession.roles) ? [...rawSession.roles] : [],
  };
}
