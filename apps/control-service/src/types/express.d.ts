/**
 * Type extensions for Express Request object.
 * Adds auth context to Request after authentication middleware runs.
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Authentication context set by authenticate middleware.
       * Contains actor (user) and tenant (organization) information.
       */
      auth: {
        actor: {
          actorId: string;
          actorName: string;
          actorType: "human" | "service_account" | "system";
          authMode: string;
        };
        tenant: {
          orgId: string;
          workspaceId: string;
          projectId: string;
        };
      };
    }
  }
}

export {};
