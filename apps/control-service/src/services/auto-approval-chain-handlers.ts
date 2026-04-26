import { loadRunBundle, updateRunState } from "@memory/run-store";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder";
import { logger } from "@shared/logger";
import type { TenantContext, ActorType } from "@shared/types";
import { getAlertStore } from "./alert-store";

/**
 * Event handler for auto-approval chain events
 * Implements callbacks for gate approval/rejection and chain completion
 */

export interface AutoApprovalEventContext {
  runId: string;
  gateId: string;
  tenant: TenantContext;
  actor: { id: string; type: ActorType; name: string };
  correlationId: string;
  metadata?: Record<string, any>;
}

export interface ChainCompletionContext extends Omit<AutoApprovalEventContext, "gateId"> {
  totalGates: number;
  approvedGates: number;
  rejectedGates: number;
  result: "success" | "partial_failure" | "full_failure";
}

/**
 * Handler invoked when a gate is automatically approved
 * Logs audit event, records in alert store if threshold reached
 */
export async function onGateApproved(context: AutoApprovalEventContext): Promise<void> {
  try {
    const bundle = loadRunBundle(context.runId);
    if (!bundle) {
      logger.warn({ runId: context.runId }, "Run bundle not found for approval event");
      return;
    }

    // Log audit event for gate approval
    await new AuditEventBuilder(AuditActions.GATE_AUTO_APPROVED, {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withRunId(context.runId)
      .withGateId(context.gateId)
      .withResult("success")
      .withCorrelationId(context.correlationId)
      .withDetails({
        approvalMode: "auto",
        timestamp: new Date().toISOString(),
        ...context.metadata,
      })
      .emit();

    // Update run state with approved gate
    const approvedGates = bundle.state.approvedGates || [];
    if (!approvedGates.includes(context.gateId)) {
      bundle.state.approvedGates = [...approvedGates, context.gateId];
      bundle.state.updatedAt = new Date().toISOString();
      updateRunState(context.runId, bundle.state);
    }

    logger.info(
      {
        runId: context.runId,
        gateId: context.gateId,
        correlationId: context.correlationId,
      },
      "Gate automatically approved"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        runId: context.runId,
        gateId: context.gateId,
      },
      "Error handling gate approval event"
    );

    // Don't throw - this is an event handler, we don't want to propagate errors
    // but we log them for observability
  }
}

/**
 * Handler invoked when a gate is rejected
 * Logs audit event, triggers alert, and may suggest healing actions
 */
export async function onGateRejected(context: AutoApprovalEventContext): Promise<void> {
  try {
    const bundle = loadRunBundle(context.runId);
    if (!bundle) {
      logger.warn({ runId: context.runId }, "Run bundle not found for rejection event");
      return;
    }

    // Log audit event for gate rejection
    await new AuditEventBuilder(AuditActions.GATE_REJECTED, {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withRunId(context.runId)
      .withGateId(context.gateId)
      .withResult("failure")
      .withCorrelationId(context.correlationId)
      .withDetails({
        rejectionReason: context.metadata?.reason || "Manual rejection",
        rejectedAt: new Date().toISOString(),
        ...context.metadata,
      })
      .emit();

    // Record rejection in run state
    const rejectedGates = bundle.state.rejectedGates || [];
    if (!rejectedGates.includes(context.gateId)) {
      bundle.state.rejectedGates = [...rejectedGates, context.gateId];
      bundle.state.updatedAt = new Date().toISOString();
      updateRunState(context.runId, bundle.state);

      // Create alert for gate rejection
      const alertStore = getAlertStore();
      await alertStore.recordAlert({
        id: `alert-${context.correlationId}-${context.gateId}`,
        type: "deployment_failure",
        severity: "high",
        title: `Gate Rejected: ${context.gateId}`,
        description: `The gate ${context.gateId} was rejected. Reason: ${context.metadata?.reason || "Unknown"}`,
        isResolved: false,
        createdAt: new Date(),
        source: "auto-approval-chain",
        alertId: context.gateId,
        metadata: {
          runId: context.runId,
          gateId: context.gateId,
          correlationId: context.correlationId,
          reason: context.metadata?.reason,
        },
      });
    }

    logger.info(
      {
        runId: context.runId,
        gateId: context.gateId,
        correlationId: context.correlationId,
        reason: context.metadata?.reason,
      },
      "Gate rejected"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        runId: context.runId,
        gateId: context.gateId,
      },
      "Error handling gate rejection event"
    );
  }
}

/**
 * Handler invoked when the auto-approval chain completes
 * Summarizes results, logs completion audit event, and triggers downstream actions
 */
export async function onAutoApprovalChainCompleted(
  context: ChainCompletionContext
): Promise<void> {
  try {
    const bundle = loadRunBundle(context.runId);
    if (!bundle) {
      logger.warn({ runId: context.runId }, "Run bundle not found for completion event");
      return;
    }

    // Log completion audit event
    await new AuditEventBuilder("AUTO_APPROVAL_CHAIN_COMPLETED", {
      tenant: context.tenant,
      actor: context.actor,
    })
      .withRunId(context.runId)
      .withResult(context.result === "success" ? "success" : "failure")
      .withCorrelationId(context.correlationId)
      .withDetails({
        chainResult: context.result,
        totalGates: context.totalGates,
        approvedGates: context.approvedGates,
        rejectedGates: context.rejectedGates,
        completedAt: new Date().toISOString(),
        approvalRate: `${Math.round((context.approvedGates / context.totalGates) * 100)}%`,
      })
      .emit();

    // Update run state with chain completion status
    bundle.state.chainStatus = context.result;
    bundle.state.chainCompletedAt = new Date().toISOString();
    bundle.state.updatedAt = new Date().toISOString();
    updateRunState(context.runId, bundle.state);

    // Create alert for failures (but not for successful completions)
    if (context.result !== "success") {
      const alertStore = getAlertStore();
      const severity = context.result === "full_failure" ? "critical" : "high";
      await alertStore.recordAlert({
        id: `alert-chain-${context.correlationId}`,
        type: "approval_chain_failure",
        severity,
        title: `Auto-Approval Chain ${context.result === "full_failure" ? "Failed" : "Partially Failed"}`,
        description: `Approved: ${context.approvedGates}/${context.totalGates}, Rejected: ${context.rejectedGates}/${context.totalGates}`,
        isResolved: false,
        createdAt: new Date(),
        source: "auto-approval-chain",
        metadata: {
          runId: context.runId,
          correlationId: context.correlationId,
          result: context.result,
          totalGates: context.totalGates,
          approvedGates: context.approvedGates,
          rejectedGates: context.rejectedGates,
        },
      });
    }

    logger.info(
      {
        runId: context.runId,
        correlationId: context.correlationId,
        result: context.result,
        approved: context.approvedGates,
        rejected: context.rejectedGates,
        total: context.totalGates,
      },
      "Auto-approval chain completed"
    );
  } catch (err: any) {
    logger.error(
      {
        err,
        runId: context.runId,
        correlationId: context.correlationId,
      },
      "Error handling chain completion event"
    );
  }
}

/**
 * Registry for auto-approval event handlers
 * Allows registering custom handlers for different events
 */
interface EventHandlerRegistry {
  onGateApproved: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onGateRejected: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onChainCompleted: Set<(context: ChainCompletionContext) => Promise<void>>;
}

const handlerRegistry: EventHandlerRegistry = {
  onGateApproved: new Set(),
  onGateRejected: new Set(),
  onChainCompleted: new Set(),
};

/**
 * Register a custom handler for gate approved events
 */
export function registerGateApprovedHandler(
  handler: (context: AutoApprovalEventContext) => Promise<void>
): void {
  handlerRegistry.onGateApproved.add(handler);
}

/**
 * Register a custom handler for gate rejected events
 */
export function registerGateRejectedHandler(
  handler: (context: AutoApprovalEventContext) => Promise<void>
): void {
  handlerRegistry.onGateRejected.add(handler);
}

/**
 * Register a custom handler for chain completion events
 */
export function registerChainCompletedHandler(
  handler: (context: ChainCompletionContext) => Promise<void>
): void {
  handlerRegistry.onChainCompleted.add(handler);
}

/**
 * Dispatch gate approved event to all registered handlers
 */
export async function dispatchGateApprovedEvent(
  context: AutoApprovalEventContext
): Promise<void> {
  // Call built-in handler
  await onGateApproved(context);

  // Call all registered handlers
  for (const handler of handlerRegistry.onGateApproved) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, runId: context.runId, gateId: context.gateId },
        "Custom gate approved handler failed"
      );
    }
  }
}

/**
 * Dispatch gate rejected event to all registered handlers
 */
export async function dispatchGateRejectedEvent(
  context: AutoApprovalEventContext
): Promise<void> {
  // Call built-in handler
  await onGateRejected(context);

  // Call all registered handlers
  for (const handler of handlerRegistry.onGateRejected) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, runId: context.runId, gateId: context.gateId },
        "Custom gate rejected handler failed"
      );
    }
  }
}

/**
 * Dispatch chain completion event to all registered handlers
 */
export async function dispatchChainCompletedEvent(
  context: ChainCompletionContext
): Promise<void> {
  // Call built-in handler
  await onAutoApprovalChainCompleted(context);

  // Call all registered handlers
  for (const handler of handlerRegistry.onChainCompleted) {
    try {
      await handler(context);
    } catch (err: any) {
      logger.error(
        { err, runId: context.runId },
        "Custom chain completed handler failed"
      );
    }
  }
}

/**
 * Get all registered handlers (useful for testing)
 */
export function getHandlerRegistry(): EventHandlerRegistry {
  return handlerRegistry;
}
