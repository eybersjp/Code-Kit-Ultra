import { Request, Response, NextFunction } from "express";
import { resolveApiKeyUser } from "../../../../packages/core/src/auth.js";
import { resolveInsForgeSession } from "../../../../packages/auth/src/resolve-session.js";
import { resolvePermissions, Permission } from "../../../../packages/policy/src/index.js";
import { AuthenticatedActor, TenantContext } from "../../../../packages/shared/src/types.js";

export interface NormalizedAuthContext {
  actor: AuthenticatedActor;
  tenant: TenantContext;
  permissions: Permission[];
  authMode: "legacy_api_key" | "bearer_session";
  memberships?: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: NormalizedAuthContext;
      // Keep legacy user for backward compatibility
      user?: import("../../../../packages/shared/src/types.js").AuthUser;
    }
  }
}

import { ServiceAccountAuth } from "../../../../packages/auth/src/service-account.js";

/**
 * Middleware that parses either an InsForge JWT bearer token, a service account token, or a legacy API key,
 * resolving it into a NormalizedAuthContext.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"] as string;

  try {
    // 1. Try Bearer Session Auth (InsForge or Service Account)
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      let session: any;

      // Handle Service Account specifically if tagged
      if (ServiceAccountAuth.isServiceAccountToken(token)) {
        session = await ServiceAccountAuth.verifyToken(token);
      } else {
        session = await resolveInsForgeSession(token);
      }

      // Validate session was successfully resolved
      if (!session || !session.actor || !session.tenant) {
        res.status(401).json({ error: "Unauthorized: Invalid bearer token" });
        return;
      }

      const permissions = resolvePermissions(session.actor.roles);

      req.auth = {
        actor: session.actor,
        tenant: session.tenant,
        permissions,
        authMode: "bearer_session",
        memberships: session.actor.roles,
      };

      return next();
    }

    // 2. Fallback to Legacy API Key (Deprecated for human/operator usage)
    if (apiKey && process.env.CKU_LEGACY_API_KEYS_ENABLED !== "false") {
      const legacyUser = resolveApiKeyUser(apiKey);
      
      if (!legacyUser) {
        res.status(401).json({ error: "Unauthorized: Invalid legacy API key" });
        return;
      }

      // Log deprecation for human/operator usage
      console.warn(`[AUTH] DEPRECATED: Legacy API key used for actor ${legacyUser.id}. Please transition to InsForge bearer sessions for human access or Service Account tokens for automated tasks.`);

      req.user = legacyUser;
      
      const permissions = resolvePermissions([legacyUser.role]);

      req.auth = {
        actor: {
          actorId: legacyUser.id,
          actorName: legacyUser.id, // Fallback since legacy user has no name
          actorType: "legacy_api_key",
          roles: [legacyUser.role],
        },
        tenant: {
          orgId: "default",
          workspaceId: "default",
        },
        permissions,
        authMode: "legacy_api_key",
        memberships: [legacyUser.role],
      };

      return next();
    }

    res.status(401).json({ error: "Unauthorized: No valid bearer token or API key provided." });
  } catch (err: any) {
    console.error("Authentication Error:", err.message);
    res.status(401).json({ error: `Unauthorized: ${err.message}` });
  }
}
