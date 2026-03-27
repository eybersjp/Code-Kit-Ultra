export interface IssueExecutionTokenInput {
  actorId: string;
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  runId?: string;
  scopes: string[];
  ttlSeconds: number;
  signingKey: string;
}

export interface IssuedExecutionToken {
  token: string;
  expiresAt: string;
}

export function issueExecutionToken(
  input: IssueExecutionTokenInput,
): IssuedExecutionToken {
  // TODO:
  // Sign short-lived JWT or PASETO for internal execution actions.
  // Must include actor, tenant, scopes, correlation, and expiry.
  throw new Error("Not implemented");
}
