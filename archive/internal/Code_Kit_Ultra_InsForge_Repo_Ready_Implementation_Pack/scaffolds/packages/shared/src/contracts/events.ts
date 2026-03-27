export interface CanonicalEventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId: string;
  orgId: string;
  workspaceId: string;
  projectId: string;
  runId?: string;
  actor?: {
    type: "user" | "service_account" | "system";
    id: string;
  };
  payload: TPayload;
}
