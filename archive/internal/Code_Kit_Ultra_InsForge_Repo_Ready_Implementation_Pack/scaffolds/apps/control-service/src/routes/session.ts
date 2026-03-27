import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/authenticate";

const router = Router();

router.get("/v1/session", (req: AuthenticatedRequest, res) => {
  if (!req.sessionContext) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({
    actorId: req.sessionContext.actorId,
    organizationId: req.sessionContext.organizationId,
    workspaceId: req.sessionContext.workspaceId,
    projectId: req.sessionContext.projectId,
    permissions: req.sessionContext.permissions,
  });
});

export default router;
