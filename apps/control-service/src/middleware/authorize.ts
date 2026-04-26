import { Request, Response, NextFunction } from "express";
import { Permission } from "../../../../packages/policy/src/permissions.js";

// Require a specific single permission
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ error: "Missing authentication context" });

    if (!auth.permissions.includes(permission)) {
      return res.status(403).json({ error: `Forbidden: Missing required permission '${permission}'` });
    }
    next();
  };
}

// Require ANY of the permissions in the list
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ error: "Missing authentication context" });

    const hasAny = permissions.some((p: Permission) => auth.permissions.includes(p));
    if (!hasAny) {
      return res.status(403).json({ 
        error: `Forbidden: Missing one of the required permissions [${permissions.join(", ")}]` 
      });
    }
    next();
  };
}

// Require the request target to match actor's project scope
export function requireProjectScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ error: "Missing authentication context" });

    const targetProject = req.params.projectId || req.query.projectId || req.body.projectId;
    if (targetProject && auth.tenant.projectId && auth.tenant.projectId !== targetProject) {
      return res.status(403).json({ error: "Forbidden: Cross-project access denied." });
    }
    next();
  };
}

// Require the request target to match actor's org scope
export function requireOrgScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ error: "Missing authentication context" });

    const targetOrg = req.params.orgId || req.query.orgId || req.body.orgId;
    if (targetOrg && auth.tenant.orgId !== "default" && auth.tenant.orgId !== targetOrg) {
      return res.status(403).json({ error: "Forbidden: Cross-org access denied." });
    }
    next();
  };
}
