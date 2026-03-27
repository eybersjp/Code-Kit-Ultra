import jwt from "jsonwebtoken";
import { ExecutionScope } from "../../shared/src/types";

/**
 * Issues a short-lived internal execution token scoped for a specific run.
 * This token is used by the orchestrator and agents to authenticate within 
 * the current execution context.
 */
export async function issueExecutionToken(scope: ExecutionScope): Promise<string> {
  const secret = process.env.INSFORGE_SERVICE_ROLE_KEY;
  const issuer = process.env.INSFORGE_JWT_ISSUER || "code-kit-ultra-internal";
  const audience = process.env.INSFORGE_JWT_AUDIENCE || "execution-engine-worker";

  if (!secret) {
    throw new Error("Internal execution token foundation (INSFORGE_SERVICE_ROLE_KEY) is not configured.");
  }

  const claims = {
    sub: scope.actor.actorId,
    run_id: scope.runId,
    org_id: scope.tenant.orgId,
    workspace_id: scope.tenant.workspaceId,
    project_id: scope.tenant.projectId,
    actor_type: scope.actor.actorType,
    correlation_id: scope.correlationId,
    roles: scope.actor.roles,
  };

  // 10 minutes is the standard scope for an internal execution window
  return jwt.sign(claims, secret, {
    issuer,
    audience,
    expiresIn: "10m",
    algorithm: "HS256",
  });
}
