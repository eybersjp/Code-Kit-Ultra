import { Permission } from "./permissions.js";

// Mapping InsForge-style or CKU legacy roles to core permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "run:create", "run:view", "run:cancel",
    "gate:view", "gate:approve", "gate:reject",
    "execution:view", "execution:high_risk", "execution:rollback",
    "healing:invoke",
    "policy:view", "policy:manage",
    "audit:view",
    "service_account:manage", "service_account:view",
    "automation:view", "automation:manage"
  ],
  operator: [
    "run:create", "run:view", "run:cancel",
    "gate:view", "gate:approve",
    "execution:view", "execution:high_risk",
    "healing:invoke",
    "policy:view",
    "automation:view", "automation:manage"
  ],
  reviewer: [
    "run:view",
    "gate:view", "gate:approve", "gate:reject",
    "execution:view",
    "policy:view",
    "audit:view",
    "automation:view"
  ],
  viewer: [
    "run:view",
    "gate:view",
    "execution:view",
    "policy:view",
    "audit:view",
    "automation:view"
  ],
  service_account: [
    "run:create", "run:view", "run:cancel",
    "gate:view", "gate:approve",
    "execution:view", "execution:high_risk",
    "healing:invoke",
    "automation:view", "automation:manage"
  ]
};

// Aliases mapped to internal roles (e.g. InsForge Owner maps to admin)
export const ROLE_ALIASES: Record<string, string> = {
  owner: "admin",
  Owner: "admin",
  Admin: "admin",
  Operator: "operator",
  Reviewer: "reviewer",
  Viewer: "viewer",
  ServiceAccount: "service_account"
};
