import type { PromptBuildContextTenant } from '../contracts.js';

/**
 * Resolves and validates a raw tenant input into a typed
 * PromptBuildContextTenant.
 *
 * All three of `orgId`, `workspaceId`, and `projectId` are required; an error
 * is thrown if any of them are absent or empty. `projectName` is optional.
 *
 * @param raw  Unvalidated tenant data sourced from the request context.
 * @returns    Typed tenant sub-object for inclusion in PromptBuildContext.
 * @throws     Error listing every missing required field.
 */
export function resolveTenantContext(raw: {
  orgId: string;
  workspaceId: string;
  projectId: string;
  projectName?: string;
}): PromptBuildContextTenant {
  const missing: string[] = [];

  if (typeof raw.orgId !== 'string' || raw.orgId.trim() === '') {
    missing.push('orgId');
  }
  if (typeof raw.workspaceId !== 'string' || raw.workspaceId.trim() === '') {
    missing.push('workspaceId');
  }
  if (typeof raw.projectId !== 'string' || raw.projectId.trim() === '') {
    missing.push('projectId');
  }

  if (missing.length > 0) {
    throw new Error(
      `resolveTenantContext: missing required fields: [${missing.join(', ')}]`,
    );
  }

  return {
    orgId: raw.orgId.trim(),
    workspaceId: raw.workspaceId.trim(),
    projectId: raw.projectId.trim(),
    ...(typeof raw.projectName === 'string' && raw.projectName.trim() !== ''
      ? { projectName: raw.projectName.trim() }
      : {}),
  };
}
