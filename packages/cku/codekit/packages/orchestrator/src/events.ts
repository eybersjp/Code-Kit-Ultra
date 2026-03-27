import { publishEvent } from "../../events/src/index.js";
import type { RunState } from "../../shared/src/types";

/**
 * Wave 5: Orchestrator event helper.
 * Extracts context from the RunState to ensure events are properly scoped.
 */
export async function emitOrchestratorEvent(eventType: string, state: RunState, payload?: any) {
  if (!state.orgId || !state.workspaceId) {
    // console.warn(`[Orchestrator] Skipping event ${eventType} due to missing tenant scope on run ${state.runId}`);
    return;
  }

  return publishEvent(eventType, {
    runId: state.runId,
    tenant: {
      orgId: state.orgId,
      workspaceId: state.workspaceId,
      projectId: state.projectId
    },
    actor: {
      id: state.actorId || "system",
      type: state.actorType || "service_account",
      authMode: "system-orchestrator"
    },
    correlationId: state.correlationId || "unknown",
    payload
  });
}

// Convenience helpers for Phase Engine
export const emitExecutionStarted = (state: RunState) => emitOrchestratorEvent("execution.started", state);
export const emitExecutionCompleted = (state: RunState) => emitOrchestratorEvent("execution.completed", state);
export const emitExecutionFailed = (state: RunState, error?: string) => emitOrchestratorEvent("execution.failed", state, { error });
export const emitGateAwaitingApproval = (state: RunState, reason?: string) => emitOrchestratorEvent("gate.awaiting_approval", state, { reason });
export const emitVerificationCompleted = (state: RunState, result: any) => emitOrchestratorEvent("verification.completed", state, { result });
