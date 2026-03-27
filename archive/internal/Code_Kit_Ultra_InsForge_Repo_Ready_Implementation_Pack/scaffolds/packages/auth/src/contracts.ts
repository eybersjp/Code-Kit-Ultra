export type TenantRole =
  | "owner"
  | "admin"
  | "operator"
  | "reviewer"
  | "viewer"
  | "service_account";

export interface AuthenticatedActor {
  userId: string;
  insforgeUserId: string;
  email?: string;
  organizationIds: string[];
  defaultOrganizationId?: string;
}

export interface TenantContext {
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  role?: TenantRole;
}

export interface SessionContext {
  actor: AuthenticatedActor;
  tenant: TenantContext;
  permissions: string[];
}
