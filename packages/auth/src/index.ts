/**
 * Code Kit Ultra Auth Foundation
 * InsForge-first authentication and session management
 */

export * from "./contracts";
export * from "./verify-insforge-token";
export * from "./resolve-session";
export * from "./issue-execution-token";

// Forward declare shared types for convenience
export type { 
  ResolvedSession, 
  ActorType, 
  TenantContext, 
  AuthenticatedActor, 
  ExecutionScope 
} from "../../shared/src/types";
