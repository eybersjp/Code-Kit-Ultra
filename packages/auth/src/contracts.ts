import { ResolvedSession, TenantContext, ExecutionScope } from "../../shared/src/types";

export interface SessionResolver {
  resolve(token: string): Promise<ResolvedSession>;
}

export interface InternalTokenIssuer {
  issue(scope: ExecutionScope): Promise<string>;
}

export interface VerificationResult {
  valid: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}
