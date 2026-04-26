import { getAlertAcknowledgmentService } from "./alert-acknowledgment-service";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder";
import { logger } from "../../../../packages/shared/src/logger";
import { getAlertStore } from "./alert-store";
import type { TenantContext, ActorType } from "../../../../packages/shared/src/types";

/**
 * Event handler for alert auto-acknowledgment lifecycle events
 * Implements callbacks for alert auto-acknowledgment, escalation, and completion
 */

export interface AlertAutoAcknowledgmentContext {
  alertId: string;
  tenant: TenantContext;
  actor: { id: string; type: ActorType; name: string };
  correlationId: string;
  reason?: string;
  ruleId?: string;
  metadata?: Record<string, any>;
}

export interface AlertEscalationContext extends AlertAutoAcknowledgmentContext {
  escalationLevel: number;
  failedConditions?: string[];
}

export interface AcknowledgmentCompletionContext
  extends Omit<AlertAutoAcknowledgmentContext, "ruleId"> {
  status: "acknowledged" | "escalated" | "unresolved";
  acknowledgedAt?: Date;
  escalatedAt?: Date;
}

/**
 * Handler invoked when an alert is automatically acknowledged
 * Logs audit event and updates alert state
 */
export async function onAlertAutoAcknowledged(
  context: AlertAutoAcknowledgmentContext
): Promise<void> {
  try {
    const alertStore = getAlertStore();
    const alert = await alertStore.getAlert(context.alertId);

    if (!alert) {
      logger.warn({ alertId: context.alertId }, "Alert not found for auto-acknowledgment event");
      return;
    }

    // Log audit event for auto-acknowledgment
    await new AuditEventBuilder(AuditActions.ALERT_AUTO_ACKNOWLEDGED, {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withAlertId(context.alertId)
      .withRuleId(context.ruleId)
      .withResult("success")
      .withCorrelationId(context.correlationId)
      .withDetails({
        acknowledgedBy: context.actor.name,
        timestamp: new Date().toISOString(),
        reason: context.reason,
        ...context.metadata,
      })
      .emit();

    // Update alert service with acknowledgment
    const service = getAlertAcknowledgmentService();
    service.recordAcknowledgment({
      id: `ack-${context.alertId}-${Date.now()}`,
      alertId: context.alertId,
      ruleId: context.ruleId || "system",
      acknowledgedAt: new Date(),
      acknowledgedBy: context.actor.name,
      reason: context.reason || "Auto-acknowledged",
      resolutionMethod: "auto",
      metadata: context.metadata,
    });

    logger.info(
      {
        alertId: context.alertId,
        ruleId: context.ruleId,
        correlationId: context.correlationId,
      },
      "Alert automatically acknowledged"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        alertId: context.alertId,
        ruleId: context.ruleId,
      },
      "Error handling alert auto-acknowledgment event"
    );
  }
}

/**
 * Handler invoked when an alert escalates due to failed auto-acknowledgment
 * Logs audit event, creates escalation alert, and triggers notifications
 */
export async function onAlertEscalated(
  context: AlertEscalationContext
): Promise<void> {
  try {
    const alertStore = getAlertStore();
    const alert = await alertStore.getAlert(context.alertId);

    if (!alert) {
      logger.warn({ alertId: context.alertId }, "Alert not found for escalation event");
      return;
    }

    // Log audit event for escalation
    await new AuditEventBuilder(AuditActions.ALERT_ESCALATION, {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withAlertId(context.alertId)
      .withRuleId(context.ruleId)
      .withResult("failure")
      .withCorrelationId(context.correlationId)
      .withDetails({
        escalationLevel: context.escalationLevel,
        reason: context.reason,
        failedConditions: context.failedConditions || [],
        timestamp: new Date().toISOString(),
        ...context.metadata,
      })
      .emit();

    // Create escalation alert for oncall/dashboard visibility
    const escalationAlert = {
      id: `escalation-${context.alertId}-${Date.now()}`,
      type: "alert_escalation" as const,
      severity: context.escalationLevel > 1 ? ("critical" as const) : ("high" as const),
      title: `Alert Escalated: ${context.alertId}`,
      description: `Alert ${context.alertId} escalated to level ${context.escalationLevel}: ${context.reason}`,
      alertId: context.alertId,
      escalationLevel: context.escalationLevel,
      isResolved: false,
      createdAt: new Date(),
      source: "alert-auto-acknowledgment",
      metadata: {
        correlationId: context.correlationId,
        actor: context.actor.name,
        failedConditions: context.failedConditions,
        escalationReason: context.reason,
      },
    };

    await alertStore.recordAlert(escalationAlert);

    logger.warn(
      {
        alertId: context.alertId,
        escalationLevel: context.escalationLevel,
        correlationId: context.correlationId,
      },
      "Alert escalated due to failed auto-acknowledgment"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        alertId: context.alertId,
        escalationLevel: context.escalationLevel,
      },
      "Error handling alert escalation event"
    );
  }
}

/**
 * Handler invoked when acknowledgment workflow completes
 * Logs completion audit event and updates state
 */
export async function onAcknowledgmentCompleted(
  context: AcknowledgmentCompletionContext
): Promise<void> {
  try {
    const alertStore = getAlertStore();
    const alert = await alertStore.getAlert(context.alertId);

    if (!alert) {
      logger.warn({ alertId: context.alertId }, "Alert not found for completion event");
      return;
    }

    // Log completion audit event
    await new AuditEventBuilder(AuditActions.ALERT_ACKNOWLEDGMENT_COMPLETED, {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withAlertId(context.alertId)
      .withResult(context.status === "acknowledged" ? "success" : "failure")
      .withCorrelationId(context.correlationId)
      .withDetails({
        status: context.status,
        acknowledgedAt: context.acknowledgedAt?.toISOString(),
        escalatedAt: context.escalatedAt?.toISOString(),
        timestamp: new Date().toISOString(),
        ...context.metadata,
      })
      .emit();

    // Create summary alert only if there are failures
    if (context.status === "escalated") {
      const summaryAlert = {
        id: `completion-${context.alertId}-${Date.now()}`,
        type: "alert_completion_failure" as const,
        severity: "high" as const,
        title: `Alert Acknowledgment Failed: ${context.alertId}`,
        description: `Acknowledgment workflow for alert ${context.alertId} failed to resolve automatically`,
        alertId: context.alertId,
        isResolved: false,
        createdAt: new Date(),
        source: "alert-auto-acknowledgment",
        metadata: {
          correlationId: context.correlationId,
          actor: context.actor.name,
          status: context.status,
        },
      };

      await alertStore.recordAlert(summaryAlert);
    }

    logger.info(
      {
        alertId: context.alertId,
        status: context.status,
        correlationId: context.correlationId,
      },
      "Alert acknowledgment workflow completed"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        alertId: context.alertId,
        status: context.status,
      },
      "Error handling acknowledgment completion event"
    );
  }
}

/**
 * Handler registry - stores custom handlers for each event type
 */
interface EventHandlerRegistry {
  onAlertAutoAcknowledged: Set<(context: AlertAutoAcknowledgmentContext) => Promise<void>>;
  onAlertEscalated: Set<(context: AlertEscalationContext) => Promise<void>>;
  onAcknowledgmentCompleted: Set<(context: AcknowledgmentCompletionContext) => Promise<void>>;
}

const handlerRegistry: EventHandlerRegistry = {
  onAlertAutoAcknowledged: new Set(),
  onAlertEscalated: new Set(),
  onAcknowledgmentCompleted: new Set(),
};

/**
 * Register a custom handler for auto-acknowledgment events
 */
export function registerAlertAutoAcknowledgedHandler(
  handler: (context: AlertAutoAcknowledgmentContext) => Promise<void>
): void {
  handlerRegistry.onAlertAutoAcknowledged.add(handler);
  logger.debug("Registered custom handler for alert auto-acknowledgment event");
}

/**
 * Register a custom handler for escalation events
 */
export function registerAlertEscalatedHandler(
  handler: (context: AlertEscalationContext) => Promise<void>
): void {
  handlerRegistry.onAlertEscalated.add(handler);
  logger.debug("Registered custom handler for alert escalation event");
}

/**
 * Register a custom handler for completion events
 */
export function registerAcknowledgmentCompletedHandler(
  handler: (context: AcknowledgmentCompletionContext) => Promise<void>
): void {
  handlerRegistry.onAcknowledgmentCompleted.add(handler);
  logger.debug("Registered custom handler for acknowledgment completion event");
}

/**
 * Dispatch auto-acknowledgment event to built-in and custom handlers
 * Custom handler errors are isolated and do not prevent other handlers from running
 */
export async function dispatchAlertAutoAcknowledgedEvent(
  context: AlertAutoAcknowledgmentContext
): Promise<void> {
  // Invoke built-in handler
  await onAlertAutoAcknowledged(context);

  // Invoke custom handlers with error isolation
  for (const handler of handlerRegistry.onAlertAutoAcknowledged) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, alertId: context.alertId },
        "Custom handler failed for alert auto-acknowledgment event"
      );
      // Continue with next handler - error is isolated
    }
  }
}

/**
 * Dispatch escalation event to built-in and custom handlers
 * Custom handler errors are isolated and do not prevent other handlers from running
 */
export async function dispatchAlertEscalatedEvent(
  context: AlertEscalationContext
): Promise<void> {
  // Invoke built-in handler
  await onAlertEscalated(context);

  // Invoke custom handlers with error isolation
  for (const handler of handlerRegistry.onAlertEscalated) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, alertId: context.alertId },
        "Custom handler failed for alert escalation event"
      );
      // Continue with next handler - error is isolated
    }
  }
}

/**
 * Dispatch completion event to built-in and custom handlers
 * Custom handler errors are isolated and do not prevent other handlers from running
 */
export async function dispatchAcknowledgmentCompletedEvent(
  context: AcknowledgmentCompletionContext
): Promise<void> {
  // Invoke built-in handler
  await onAcknowledgmentCompleted(context);

  // Invoke custom handlers with error isolation
  for (const handler of handlerRegistry.onAcknowledgmentCompleted) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, alertId: context.alertId },
        "Custom handler failed for acknowledgment completion event"
      );
      // Continue with next handler - error is isolated
    }
  }
}

/**
 * Get the handler registry for testing or introspection
 */
export function getHandlerRegistry(): EventHandlerRegistry {
  return handlerRegistry;
}
