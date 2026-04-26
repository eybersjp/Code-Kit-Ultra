import { Request, Response } from "express";
import { ServiceAccountAuth, ServiceAccount } from "../../../../packages/auth/src/service-account.js";
import { generateServiceAccountId } from "../../../../packages/shared/src/id-generator.js";

/**
 * Wave 8: Service Account Management.
 * Admin-only management for machine users.
 */

// Simulated persistent store for service accounts
const saStore: Map<string, ServiceAccount> = new Map();

export const ServiceAccountRoutes = {
  /**
   * List all service accounts (Admin only)
   */
  async list(req: Request, res: Response) {
    const orgId = req.auth?.tenant.orgId || "default";
    const sas = Array.from(saStore.values()).filter(sa => sa.orgId === orgId);
    res.json(sas);
  },

  /**
   * Create a new service account
   */
  async create(req: Request, res: Response) {
    const { name, roles, projectId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Service account name is required" });
    }

    const id = generateServiceAccountId();
    const sa: ServiceAccount = {
      id,
      name,
      orgId: req.auth?.tenant.orgId || "default",
      workspaceId: req.auth?.tenant.workspaceId || "default",
      projectId,
      roles: roles || ["operator"],
    };

    saStore.set(id, sa);

    // Issue initial token (long-lived by default for ease of setup)
    const token = ServiceAccountAuth.issueToken(sa);

    res.status(201).json({
      message: "Service account created",
      serviceAccount: sa,
      token,
      warning: "This token will only be shown once."
    });
  },

  /**
   * Delete a service account
   */
  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    if (saStore.has(id)) {
      saStore.delete(id);
      res.json({ message: "Service account deleted" });
    } else {
      res.status(404).json({ error: "Service account not found" });
    }
  }
};
