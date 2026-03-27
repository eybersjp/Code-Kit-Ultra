import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  sessionContext?: {
    actorId: string;
    organizationId?: string;
    workspaceId?: string;
    projectId?: string;
    permissions: string[];
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    const legacyApiKey = req.header("x-api-key");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      // TODO: verify InsForge token and map to session context
      req.sessionContext = {
        actorId: "todo",
        permissions: [],
      };
      return next();
    }

    if (legacyApiKey) {
      // TODO: resolve compatibility-mode service account or legacy path
      req.sessionContext = {
        actorId: "legacy",
        permissions: [],
      };
      return next();
    }

    return res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid authentication" });
  }
}
