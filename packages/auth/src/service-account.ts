import jwt from "jsonwebtoken";
import { AuthenticatedActor, ResolvedSession, TenantContext } from "../../shared/src/types";

const SERVICE_ACCOUNT_SECRET = process.env.CKU_SERVICE_ACCOUNT_SECRET || "internal-sa-secret-change-me";

export interface ServiceAccount {
  id: string;
  name: string;
  orgId: string;
  workspaceId: string;
  projectId?: string;
  roles: string[];
  metadata?: Record<string, any>;
}

/**
 * Wave 8: Service Account Authentication.
 * Machine/Service accounts use a specific JWT flow for automated usage.
 */

export const ServiceAccountAuth = {
  /**
   * Issue a long-lived or short-lived token for a service account.
   */
  issueToken(sa: ServiceAccount, expiresIn: string | number = "30d"): string {
    const payload = {
      sub: sa.id,
      name: sa.name,
      orgId: sa.orgId,
      workspaceId: sa.workspaceId,
      projectId: sa.projectId,
      roles: sa.roles,
      type: "service_account",
    };

    return jwt.sign(payload, SERVICE_ACCOUNT_SECRET, { expiresIn: expiresIn as any });
  },

  /**
   * Verify a service account token and return the resolved session.
   */
  async verifyToken(token: string): Promise<ResolvedSession> {
    try {
      const decoded = jwt.verify(token, SERVICE_ACCOUNT_SECRET) as any;

      if (decoded.type !== "service_account") {
        throw new Error("Invalid token type: Not a service account token");
      }

      const actor: AuthenticatedActor = {
        actorId: decoded.sub,
        actorType: "service_account",
        actorName: decoded.name,
        roles: decoded.roles || ["operator"],
        authMode: "bearer_session",
      };

      const tenant: TenantContext = {
        orgId: decoded.orgId,
        workspaceId: decoded.workspaceId,
        projectId: decoded.projectId,
      };

      return {
        actor,
        tenant,
        claims: decoded,
        issuedAt: decoded.iat || Math.floor(Date.now() / 1000),
        expiresAt: decoded.exp || Math.floor(Date.now() / 1000) + 3600,
      };
    } catch (err: any) {
      throw new Error(`Service Account verification failed: ${err.message}`);
    }
  },

  /**
   * Helper to identify if a token *might* be a service account token before full verification.
   */
  isServiceAccountToken(token: string): boolean {
    const decoded = jwt.decode(token) as any;
    return decoded?.type === "service_account";
  }
};
