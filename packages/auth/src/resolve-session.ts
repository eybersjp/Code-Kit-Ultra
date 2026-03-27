import { verifyInsForgeToken } from "./verify-insforge-token";
import { ResolvedSession, ActorType, Role } from "../../shared/src/types";

/**
 * Maps verified token claims into the normalized CKU session context.
 */
export function mapClaimsToSession(claims: Record<string, any>): ResolvedSession {
  const actorId = claims.sub || claims.id || "anonymous-actor";
  const orgId = claims.org_id || claims.tenant_id || "default-org";
  const workspaceId = claims.workspace_id || claims.workspaceId || "default-workspace";
  const actorType: ActorType = claims.actor_type || "user";
  
  // Normalize roles - assuming claims.roles is an array of Role strings
  const roles: Role[] = Array.isArray(claims.roles) ? claims.roles as Role[] : ["viewer"];

  return {
    actor: {
      actorId,
      actorType,
      actorName: claims.name || claims.email || claims.sub || "Unknown Actor",
      roles,
    },
    tenant: {
      orgId,
      workspaceId,
      projectId: claims.project_id || claims.projectId,
    },
    claims,
    issuedAt: claims.iat || Math.floor(Date.now() / 1000),
    expiresAt: claims.exp || Math.floor(Date.now() / 1000) + 3600,
  };
}

/**
 * Main entry point for session resolution from an InsForge token.
 */
export async function resolveInsForgeSession(token: string): Promise<ResolvedSession> {
  const claims = await verifyInsForgeToken(token);
  return mapClaimsToSession(claims);
}
