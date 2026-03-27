import crypto from "node:crypto";
import type { TenantContext, ActorType } from "../../shared/src/types";
import { getRealtimeProvider } from "../../realtime/src/index.js";

/**
 * Standard Code-Kit-Ultra event shape.
 */
export interface CKEvent<T = any> {
  id: string;
  eventType: string;
  runId: string;
  orgId: string;
  workspaceId: string;
  projectId?: string;
  actorId: string;
  actorType: ActorType;
  authMode?: string;
  correlationId: string;
  payload: T;
  occurredAt: string;
}

/**
 * Wave 5: Canonical publisher.
 * Every event must include metadata for multi-tenant awareness and actor attribution.
 */
export async function publishEvent<T>(
  eventType: string,
  params: {
    runId: string;
    tenant: TenantContext;
    actor: { id: string; type: ActorType; authMode?: string };
    correlationId: string;
    payload?: T;
  }
): Promise<CKEvent<T>> {
  const event: CKEvent<T> = {
    id: crypto.randomUUID(),
    eventType,
    runId: params.runId,
    orgId: params.tenant.orgId,
    workspaceId: params.tenant.workspaceId,
    projectId: params.tenant.projectId,
    actorId: params.actor.id,
    actorType: params.actor.type,
    authMode: params.actor.authMode,
    correlationId: params.correlationId,
    payload: params.payload as T,
    occurredAt: new Date().toISOString(),
  };

  // 1. Distribute via RealtimeProvider
  try {
    const realtime = getRealtimeProvider();
    await realtime.broadcast(`runs/${event.runId}`, event);
  } catch (err) {
    // Realtime broadcast is secondary; soft error to protect the main run process
    console.error(`[Events] Realtime broadcast failed for ${eventType}:`, err);
  }

  // 2. Canonical Logging
  // console.log(`[EVENT: ${eventType}] Run: ${event.runId} Corr: ${event.correlationId}`);
  
  return event;
}
