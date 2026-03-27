import { Request, Response } from "express";

export function getSession(req: Request, res: Response) {
  const auth = (req as any).auth;
  
  if (!auth) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  res.json({
    actor: auth.actor,
    tenant: auth.tenant,
    memberships: auth.memberships || [],
    permissions: auth.permissions,
    authMode: auth.authMode,
    legacy: auth.authMode === "legacy_api_key",
    dev: process.env.NODE_ENV !== "production"
  });
}
