import { publishEvent } from "../../../../packages/events/src/index.js";
import type { TenantContext, ActorType } from "../../../../packages/shared/src/types";

export type EventActor = { id: string; type: ActorType; authMode?: string };

/**
 * Wave 5: Centralized dispatcher for control-service events.
 * Ensures consistent metadata (actor, tenant, correlation) for all emitted events.
 */
export async function emitRunEvent(
  eventType: string,
  params: {
    runId: string;
    tenant: TenantContext;
    actor: EventActor;
    correlationId: string;
    payload?: any;
  }
) {
  return publishEvent(eventType, params);
}

// Convenience helpers
export const emitRunCreated = (params: any) => emitRunEvent("run.created", params);
export const emitRunUpdated = (params: any) => emitRunEvent("run.updated", params);
export const emitGateAwaitingApproval = (params: any) => emitRunEvent("gate.awaiting_approval", params);
export const emitGateApproved = (params: any) => emitRunEvent("gate.approved", params);
export const emitGateRejected = (params: any) => emitRunEvent("gate.rejected", params);
export const emitExecutionStarted = (params: any) => emitRunEvent("execution.started", params);
export const emitExecutionCompleted = (params: any) => emitRunEvent("execution.completed", params);
export const emitExecutionFailed = (params: any) => emitRunEvent("execution.failed", params);
export const emitVerificationCompleted = (params: any) => emitRunEvent("verification.completed", params);
export const emitHealingSuggested = (params: any) => emitRunEvent("healing.suggested", params);
export const emitHealingApplied = (params: any) => emitRunEvent("healing.applied", params);
export const emitRollbackCompleted = (params: any) => emitRunEvent("rollback.completed", params);
