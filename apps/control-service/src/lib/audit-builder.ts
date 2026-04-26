import { writeAuditEvent } from "../../../../packages/audit/src/index.js";
import type { AuthContext } from "./handler-utils.js";

/**
 * Flexible audit context that works with different actor/tenant structures.
 */
interface AuditContext {
  actor: {
    id: string;
    name: string;
    type: string;
  };
  tenant: {
    orgId: string;
    workspaceId?: string;
    projectId?: string;
  };
}

/**
 * Fluent builder for creating structured audit events.
 * Ensures consistent audit event structure across all handlers.
 *
 * Usage:
 *   await new AuditEventBuilder('GATE_APPROVED', context)
 *     .withRunId(runId)
 *     .withResult('success')
 *     .withDetails({ gateId })
 *     .emit();
 */
export class AuditEventBuilder {
  private event: Record<string, any>;

  constructor(action: string, context: AuthContext | AuditContext) {
    this.event = {
      action,
      actorName: context.actor.name,
      actorId: context.actor.id,
      actorType: context.actor.type,
      orgId: context.tenant.orgId,
      ...(context.tenant.workspaceId && { workspaceId: context.tenant.workspaceId }),
      ...(context.tenant.projectId && { projectId: context.tenant.projectId }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add run ID to audit event.
   */
  withRunId(runId: string): this {
    this.event.runId = runId;
    return this;
  }

  /**
   * Add gate ID to audit event.
   */
  withGateId(gateId: string): this {
    this.event.gateId = gateId;
    return this;
  }

  /**
   * Add step ID to audit event.
   */
  withStepId(stepId: string): this {
    this.event.stepId = stepId;
    return this;
  }

  /**
   * Add result (success/failure) to audit event.
   */
  withResult(result: "success" | "failure"): this {
    this.event.result = result;
    return this;
  }

  /**
   * Add correlation ID for tracing related events.
   */
  withCorrelationId(correlationId: string): this {
    this.event.correlationId = correlationId;
    return this;
  }

  /**
   * Add arbitrary details to audit event.
   * Details are merged at top level (not nested).
   */
  withDetails(details: Record<string, any>): this {
    this.event = { ...this.event, ...details };
    return this;
  }

  /**
   * Emit the audit event.
   * Should be called after all builder methods are chained.
   */
  async emit(): Promise<void> {
    await writeAuditEvent(this.event);
  }

  /**
   * Get the built event without emitting.
   * Useful for testing or inspection.
   */
  build(): Record<string, any> {
    return { ...this.event };
  }
}

/**
 * Standard audit event actions.
 * Use these constants for consistency across handlers.
 */
export const AuditActions = {
  // Gate operations
  GATE_APPROVED: "GATE_APPROVED",
  GATE_REJECTED: "GATE_REJECTED",
  GATE_AUTO_APPROVED: "GATE_AUTO_APPROVED",

  // Run operations
  RUN_CREATED: "RUN_CREATED",
  RUN_RESUMED: "RUN_RESUMED",
  RUN_CANCELLED: "RUN_CANCELLED",

  // Step operations
  STEP_RETRIED: "STEP_RETRIED",
  STEP_ROLLED_BACK: "STEP_ROLLED_BACK",
  STEP_AUTO_HEALED: "STEP_AUTO_HEALED",

  // Healing operations
  HEALING_INITIATED: "HEALING_INITIATED",
  HEALING_COMPLETED: "HEALING_COMPLETED",
  HEALING_FAILED: "HEALING_FAILED",

  // Service account operations
  SERVICE_ACCOUNT_CREATED: "SERVICE_ACCOUNT_CREATED",
  SERVICE_ACCOUNT_DELETED: "SERVICE_ACCOUNT_DELETED",
  SERVICE_ACCOUNT_SECRET_ROTATED: "SERVICE_ACCOUNT_SECRET_ROTATED",

  // Session operations
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_REVOKED: "SESSION_REVOKED",

  // Authorization failures
  GATE_APPROVE_DENIED: "GATE_APPROVE_DENIED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
} as const;
