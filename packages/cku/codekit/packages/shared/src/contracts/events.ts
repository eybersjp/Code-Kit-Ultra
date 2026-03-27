import { ActorType } from "../types";

export interface BaseEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId: string;
  orgId: string;
  workspaceId: string;
  projectId?: string;
  actorId: string;
  actorType: ActorType;
  runId?: string;
}

export type CKUEventType =
  | "run.created"
  | "run.updated"
  | "gate.awaiting_approval"
  | "gate.approved"
  | "gate.rejected"
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "verification.completed"
  | "healing.suggested"
  | "healing.applied"
  | "rollback.completed";

export interface CKUEvent<T = Record<string, unknown>> extends BaseEvent {
  eventType: CKUEventType;
  payload: T;
}

export interface RunCreatedEvent extends CKUEvent<{ idea: string; mode: string }> {
  eventType: "run.created";
}

export interface RunUpdatedEvent extends CKUEvent<{ status: string }> {
  eventType: "run.updated";
}

export interface GateEvent extends CKUEvent<{ gate: string; reason?: string }> {
  eventType: "gate.awaiting_approval" | "gate.approved" | "gate.rejected";
}

export interface ExecutionEvent extends CKUEvent<{ taskId: string; adapter?: string; error?: string }> {
  eventType: "execution.started" | "execution.completed" | "execution.failed";
}

export interface VerificationEvent extends CKUEvent<{ taskId: string; status: "passed" | "failed" }> {
  eventType: "verification.completed";
}

export interface HealingEvent extends CKUEvent<{ taskId: string; suggestion?: string; diff?: string }> {
  eventType: "healing.suggested" | "healing.applied";
}

export interface RollbackEvent extends CKUEvent<{ runId: string; rollbackReason: string }> {
  eventType: "rollback.completed";
}
