import jwt from "jsonwebtoken";
import { ExecutionScope } from "../../shared/src/types";

/**
 * Verifies an execution token from the Authorization header or request body.
 * Execution tokens are short-lived tokens (10 minutes) scoped to specific runs.
 */
export interface VerifiedExecutionToken {
  sub: string;
  run_id: string;
  org_id: string;
  workspace_id: string;
  project_id: string;
  actor_type: string;
  correlation_id: string;
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Verify an execution token from the Authorization header
 * Format: "Bearer <token>" or "ExecutionToken <token>"
 */
export function verifyExecutionToken(authHeader: string): VerifiedExecutionToken {
  const secret = process.env.INSFORGE_SERVICE_ROLE_KEY;
  const issuer = process.env.INSFORGE_JWT_ISSUER || "code-kit-ultra-internal";
  const audience = process.env.INSFORGE_JWT_AUDIENCE || "execution-engine-worker";

  if (!secret) {
    throw new Error("Execution token verification failed: INSFORGE_SERVICE_ROLE_KEY not configured");
  }

  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  // Extract token from "Bearer <token>" or "ExecutionToken <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    throw new Error("Invalid authorization header format");
  }

  const [scheme, token] = parts;
  if (!/^(Bearer|ExecutionToken)$/i.test(scheme)) {
    throw new Error("Invalid authorization scheme");
  }

  if (!token) {
    throw new Error("Missing execution token");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer,
      audience,
      algorithms: ["HS256"],
    }) as VerifiedExecutionToken;

    return decoded;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new Error(`Execution token expired: ${err.message}`);
    }
    if (err.name === "JsonWebTokenError") {
      throw new Error(`Invalid execution token: ${err.message}`);
    }
    throw new Error(`Execution token verification failed: ${err.message}`);
  }
}

/**
 * Verify that execution token is scoped to the requested run ID
 */
export function validateExecutionScope(token: VerifiedExecutionToken, runId: string): boolean {
  if (token.run_id !== runId) {
    throw new Error(`Execution token run scope mismatch: token is for run ${token.run_id}, but requested ${runId}`);
  }
  return true;
}

/**
 * Check if execution token has required role/permission
 */
export function hasExecutionPermission(token: VerifiedExecutionToken, requiredRole: string): boolean {
  return token.roles.includes(requiredRole) || token.roles.includes("admin");
}
