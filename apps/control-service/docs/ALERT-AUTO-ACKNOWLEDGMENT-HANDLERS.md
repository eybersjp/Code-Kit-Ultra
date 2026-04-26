# Alert Auto-Acknowledgment Event Handlers

This document describes the event-driven architecture for alert auto-acknowledgment lifecycle events. The system provides built-in handlers for acknowledgment, escalation, and completion events, with extensibility through a custom handler registry pattern.

## Architecture Overview

The alert auto-acknowledgment handler system follows an event-driven architecture with a handler registry pattern, enabling both built-in event processing and custom extensibility for notifications, webhooks, and automated remediation.

### Event Flow Diagram

```
Alert Triggers Auto-Acknowledgment Rule
            ↓
    [onAlertAutoAcknowledged]
            ├─→ Load alert from store
            ├─→ Log audit event (ALERT_AUTO_ACKNOWLEDGED)
            ├─→ Record acknowledgment in service
            └─→ Dispatch to custom handlers (with error isolation)

Alert Fails Auto-Acknowledgment
            ↓
    [onAlertEscalated]
            ├─→ Load alert from store
            ├─→ Log audit event (ALERT_ESCALATION)
            ├─→ Create escalation alert for dashboard
            └─→ Dispatch to custom handlers (with error isolation)

Acknowledgment Workflow Completes
            ↓
    [onAcknowledgmentCompleted]
            ├─→ Load alert from store
            ├─→ Log audit event (ALERT_ACKNOWLEDGMENT_COMPLETED)
            ├─→ Create summary alert if escalated
            └─→ Dispatch to custom handlers (with error isolation)
```

## Handler Registry Pattern

The handler registry is a Set-based collection that maintains custom handlers for each event type. This pattern enables:

1. **Extensibility**: Register custom handlers without modifying core logic
2. **Error Isolation**: One handler failure doesn't prevent other handlers from running
3. **Multiple Handlers**: Support multiple handlers per event type
4. **Type Safety**: TypeScript ensures correct handler signatures

### Registry Structure

```typescript
interface EventHandlerRegistry {
  onAlertAutoAcknowledged: Set<(context: AlertAutoAcknowledgmentContext) => Promise<void>>;
  onAlertEscalated: Set<(context: AlertEscalationContext) => Promise<void>>;
  onAcknowledgmentCompleted: Set<(context: AcknowledgmentCompletionContext) => Promise<void>>;
}
```

Each Set stores handler functions that will be invoked during dispatch. Handlers are stored as references and can be cleared between tests or deployments as needed.

## Event Handler Reference

### onAlertAutoAcknowledged

Invoked when an alert is automatically acknowledged by the system.

**Signature**
```typescript
async function onAlertAutoAcknowledged(
  context: AlertAutoAcknowledgmentContext
): Promise<void>
```

**Parameters**
- `context.alertId` (string): The ID of the acknowledged alert
- `context.tenant` (TenantContext): Tenant context for multi-tenancy
- `context.actor` (object): Actor information { id, type, name }
- `context.correlationId` (string): Correlation ID for tracing
- `context.reason` (string, optional): Reason for acknowledgment
- `context.ruleId` (string, optional): Rule that triggered the auto-acknowledgment
- `context.metadata` (Record<string, any>, optional): Custom metadata

**Side Effects**
1. Loads alert from store using `alertStore.getAlert(alertId)`
2. Logs audit event via `AuditEventBuilder(AuditActions.ALERT_AUTO_ACKNOWLEDGED)`
3. Records acknowledgment via `service.recordAcknowledgment()`
4. Invokes registered custom handlers with error isolation
5. Logs result via logger.info() or logger.error()

**Example**
```typescript
import { dispatchAlertAutoAcknowledgedEvent } from './services/alert-auto-acknowledgment-handlers';

const context = {
  alertId: 'alert-123',
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'system', type: 'system', name: 'AlertAutoAckSystem' },
  correlationId: 'corr-456',
  reason: 'CPU usage below threshold',
  ruleId: 'rule-cpu-auto-ack',
  metadata: { cpuUsage: 15 },
};

await dispatchAlertAutoAcknowledgedEvent(context);
```

### onAlertEscalated

Invoked when an alert fails auto-acknowledgment and must be escalated for manual intervention.

**Signature**
```typescript
async function onAlertEscalated(
  context: AlertEscalationContext
): Promise<void>
```

**Parameters**
- `context.alertId` (string): The ID of the escalated alert
- `context.tenant` (TenantContext): Tenant context for multi-tenancy
- `context.actor` (object): Actor information { id, type, name }
- `context.correlationId` (string): Correlation ID for tracing
- `context.escalationLevel` (number): Escalation level (1-5, higher = more critical)
- `context.reason` (string): Reason for escalation
- `context.failedConditions` (string[], optional): List of conditions that failed
- `context.metadata` (Record<string, any>, optional): Custom metadata

**Side Effects**
1. Loads alert from store using `alertStore.getAlert(alertId)`
2. Logs audit event via `AuditEventBuilder(AuditActions.ALERT_ESCALATION)` with result="failure"
3. Creates escalation alert with severity determined by escalationLevel:
   - Level 1: severity="high"
   - Level 2+: severity="critical"
4. Records escalation alert via `alertStore.recordAlert(escalationAlert)`
5. Invokes registered custom handlers with error isolation
6. Logs warning via logger.warn()

**Example**
```typescript
import { dispatchAlertEscalatedEvent } from './services/alert-auto-acknowledgment-handlers';

const context = {
  alertId: 'alert-456',
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'system', type: 'system', name: 'AlertAutoAckSystem' },
  correlationId: 'corr-789',
  reason: 'CPU still high after auto-ack timeout',
  escalationLevel: 2,
  failedConditions: ['cpu_threshold_check', 'retry_limit'],
  metadata: { cpuUsage: 95, retries: 3 },
};

await dispatchAlertEscalatedEvent(context);
```

### onAcknowledgmentCompleted

Invoked when the acknowledgment workflow completes, whether successfully acknowledged, escalated, or unresolved.

**Signature**
```typescript
async function onAcknowledgmentCompleted(
  context: AcknowledgmentCompletionContext
): Promise<void>
```

**Parameters**
- `context.alertId` (string): The ID of the alert
- `context.tenant` (TenantContext): Tenant context for multi-tenancy
- `context.actor` (object): Actor information { id, type, name }
- `context.correlationId` (string): Correlation ID for tracing
- `context.status` (string): Final status ("acknowledged" | "escalated" | "unresolved")
- `context.reason` (string, optional): Reason for the status
- `context.acknowledgedAt` (Date, optional): When acknowledgment occurred
- `context.escalatedAt` (Date, optional): When escalation occurred
- `context.metadata` (Record<string, any>, optional): Custom metadata

**Side Effects**
1. Loads alert from store using `alertStore.getAlert(alertId)`
2. Logs completion audit event via `AuditEventBuilder(AuditActions.ALERT_ACKNOWLEDGMENT_COMPLETED)`
   - result="success" if status is "acknowledged"
   - result="failure" if status is not "acknowledged"
3. Creates summary alert only if status is "escalated":
   - type: "alert_completion_failure"
   - severity: "high"
   - title: "Alert Acknowledgment Failed: {alertId}"
4. Records summary alert via `alertStore.recordAlert(summaryAlert)` if needed
5. Invokes registered custom handlers with error isolation
6. Logs info via logger.info()

**Example**
```typescript
import { dispatchAcknowledgmentCompletedEvent } from './services/alert-auto-acknowledgment-handlers';

const context = {
  alertId: 'alert-456',
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'user-123', type: 'user', name: 'John Doe' },
  correlationId: 'corr-789',
  status: 'escalated',
  acknowledgedAt: new Date('2025-01-15T10:00:00Z'),
  escalatedAt: new Date('2025-01-15T10:15:00Z'),
  metadata: { manuallyAcknowledgedAt: '2025-01-15T10:30:00Z' },
};

await dispatchAcknowledgmentCompletedEvent(context);
```

## Dispatch Functions Reference

Dispatch functions invoke both built-in and custom handlers with error isolation.

### dispatchAlertAutoAcknowledgedEvent

Dispatches the auto-acknowledgment event to all registered handlers.

```typescript
async function dispatchAlertAutoAcknowledgedEvent(
  context: AlertAutoAcknowledgmentContext
): Promise<void>
```

**Behavior**
1. Invokes `onAlertAutoAcknowledged()` (built-in handler)
2. Iterates through custom handlers in registry
3. Invokes each custom handler with error isolation
4. Logs error and continues if a custom handler fails
5. Returns after all handlers have been attempted

### dispatchAlertEscalatedEvent

Dispatches the escalation event to all registered handlers.

```typescript
async function dispatchAlertEscalatedEvent(
  context: AlertEscalationContext
): Promise<void>
```

**Behavior**
1. Invokes `onAlertEscalated()` (built-in handler)
2. Iterates through custom handlers in registry
3. Invokes each custom handler with error isolation
4. Logs error and continues if a custom handler fails
5. Returns after all handlers have been attempted

### dispatchAcknowledgmentCompletedEvent

Dispatches the completion event to all registered handlers.

```typescript
async function dispatchAcknowledgmentCompletedEvent(
  context: AcknowledgmentCompletionContext
): Promise<void>
```

**Behavior**
1. Invokes `onAcknowledgmentCompleted()` (built-in handler)
2. Iterates through custom handlers in registry
3. Invokes each custom handler with error isolation
4. Logs error and continues if a custom handler fails
5. Returns after all handlers have been attempted

## Custom Handler Registration API

### registerAlertAutoAcknowledgedHandler

Register a custom handler for auto-acknowledgment events.

```typescript
function registerAlertAutoAcknowledgedHandler(
  handler: (context: AlertAutoAcknowledgmentContext) => Promise<void>
): void
```

**Example: Send Notification**
```typescript
import { registerAlertAutoAcknowledgedHandler } from './services/alert-auto-acknowledgment-handlers';
import { notificationService } from './services/notification-service';

registerAlertAutoAcknowledgedHandler(async (context) => {
  await notificationService.sendNotification({
    tenantId: context.tenant.id,
    alertId: context.alertId,
    type: 'alert_acknowledged',
    message: `Alert ${context.alertId} was automatically acknowledged: ${context.reason}`,
    recipient: 'oncall-team',
  });
});
```

**Example: Webhook Call**
```typescript
registerAlertAutoAcknowledgedHandler(async (context) => {
  const response = await fetch('https://webhook.example.com/alert-ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alertId: context.alertId,
      status: 'acknowledged',
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }
});
```

### registerAlertEscalatedHandler

Register a custom handler for escalation events.

```typescript
function registerAlertEscalatedHandler(
  handler: (context: AlertEscalationContext) => Promise<void>
): void
```

**Example: Page Oncall**
```typescript
import { registerAlertEscalatedHandler } from './services/alert-auto-acknowledgment-handlers';
import { pagerdutyService } from './services/pagerduty-service';

registerAlertEscalatedHandler(async (context) => {
  if (context.escalationLevel >= 2) {
    await pagerdutyService.createIncident({
      title: `Alert Escalation: ${context.alertId}`,
      severity: context.escalationLevel > 2 ? 'critical' : 'high',
      description: context.reason,
      customDetails: {
        failedConditions: context.failedConditions,
        ...context.metadata,
      },
    });
  }
});
```

**Example: Auto-Remediation**
```typescript
registerAlertEscalatedHandler(async (context) => {
  // Attempt automatic remediation for specific alert types
  if (context.failedConditions?.includes('memory_threshold')) {
    await remediationService.restartService(context.metadata.serviceId);
  }
});
```

### registerAcknowledgmentCompletedHandler

Register a custom handler for completion events.

```typescript
function registerAcknowledgmentCompletedHandler(
  handler: (context: AcknowledgmentCompletionContext) => Promise<void>
): void
```

**Example: Update Ticket System**
```typescript
import { registerAcknowledgmentCompletedHandler } from './services/alert-auto-acknowledgment-handlers';
import { jiraService } from './services/jira-service';

registerAcknowledgmentCompletedHandler(async (context) => {
  if (context.status === 'acknowledged') {
    await jiraService.updateIssue(context.metadata.ticketId, {
      status: 'resolved',
      comment: `Automatically resolved by alert auto-acknowledgment system`,
    });
  }
});
```

## Integration Workflow Example

Complete alert acknowledgment workflow showing how all events flow together.

```typescript
import {
  dispatchAlertAutoAcknowledgedEvent,
  dispatchAlertEscalatedEvent,
  dispatchAcknowledgmentCompletedEvent,
  registerAlertEscalatedHandler,
} from './services/alert-auto-acknowledgment-handlers';
import { AlertAcknowledgmentService } from './services/alert-acknowledgment-service';

// 1. Register custom handlers (typically done at startup)
registerAlertEscalatedHandler(async (context) => {
  // Send Slack notification for escalations
  await slackService.postMessage({
    channel: '#alerts',
    text: `🚨 Alert Escalated: ${context.alertId} (Level ${context.escalationLevel})`,
  });
});

// 2. Service receives alert and checks auto-acknowledgment rules
const acknowledmentService = new AlertAcknowledgmentService();
const alert = { id: 'alert-123', severity: 'high', /* ... */ };

// 3. Auto-acknowledgment succeeds → dispatch event
const autoAckContext = {
  alertId: alert.id,
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'system', type: 'system', name: 'AutoAckSystem' },
  correlationId: 'corr-abc123',
  reason: 'Disk usage returned to normal',
  ruleId: 'rule-disk-auto-ack',
  metadata: { diskUsage: 65 },
};

await dispatchAlertAutoAcknowledgedEvent(autoAckContext);
// → onAlertAutoAcknowledged logs audit event and records acknowledgment
// → Custom handlers invoked (isolated, non-blocking)

// 4. If auto-acknowledgment failed, escalation event is dispatched
const escalationContext = {
  alertId: alert.id,
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'system', type: 'system', name: 'AutoAckSystem' },
  correlationId: 'corr-abc123',
  reason: 'Disk usage remained above threshold',
  escalationLevel: 2,
  failedConditions: ['disk_threshold_check', 'retry_limit_exceeded'],
  metadata: { diskUsage: 95, retries: 3 },
};

await dispatchAlertEscalatedEvent(escalationContext);
// → onAlertEscalated logs audit event, creates escalation alert
// → Custom handler sends Slack message
// → Oncall team is notified

// 5. When workflow completes, completion event is dispatched
const completionContext = {
  alertId: alert.id,
  tenant: { id: 'tenant-1', name: 'Acme Corp' },
  actor: { id: 'user-456', type: 'user', name: 'Alice' },
  correlationId: 'corr-abc123',
  status: 'escalated', // or 'acknowledged' or 'unresolved'
  acknowledgedAt: new Date(),
  escalatedAt: new Date(),
  metadata: { manuallyAcknowledgedBy: 'user-456' },
};

await dispatchAcknowledgmentCompletedEvent(completionContext);
// → onAcknowledgmentCompleted logs audit event
// → If escalated: creates summary alert for dashboard
// → Custom handlers invoked (update tickets, etc.)
```

## Testing Patterns

### Unit Testing Handlers

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  onAlertAutoAcknowledged,
  registerAlertAutoAcknowledgedHandler,
  dispatchAlertAutoAcknowledgedEvent,
  getHandlerRegistry,
} from './alert-auto-acknowledgment-handlers';
import * as alertService from './alert-acknowledgment-service';
import * as alertStore from '../../../packages/alert-management/src/alert-store';
import * as auditBuilder from '../lib/audit-builder';

vi.mock('./alert-acknowledgment-service');
vi.mock('../../../packages/alert-management/src/alert-store');
vi.mock('../lib/audit-builder');

describe('Alert Auto-Acknowledgment Handlers', () => {
  const mockContext = {
    alertId: 'alert-123',
    tenant: { id: 'tenant-1', name: 'Test Tenant' },
    actor: { id: 'system', type: 'system' as const, name: 'System' },
    correlationId: 'corr-123',
    reason: 'Auto-acknowledged',
    ruleId: 'rule-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear handler registry
    const registry = getHandlerRegistry();
    registry.onAlertAutoAcknowledged.clear();
  });

  it('should log audit event on successful auto-acknowledgment', async () => {
    const mockAlert = { id: 'alert-123', status: 'open' };
    vi.mocked(alertStore.getAlertStore).mockReturnValue({
      getAlert: vi.fn().mockResolvedValue(mockAlert),
    } as any);

    await onAlertAutoAcknowledged(mockContext);

    expect(auditBuilder.AuditEventBuilder).toHaveBeenCalledWith(
      'ALERT_AUTO_ACKNOWLEDGED',
      expect.any(Object)
    );
  });

  it('should invoke custom handlers with error isolation', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn().mockRejectedValue(new Error('Handler error'));
    const handler3 = vi.fn();

    registerAlertAutoAcknowledgedHandler(handler1);
    registerAlertAutoAcknowledgedHandler(handler2);
    registerAlertAutoAcknowledgedHandler(handler3);

    vi.mocked(alertStore.getAlertStore).mockReturnValue({
      getAlert: vi.fn().mockResolvedValue({ id: 'alert-123' }),
    } as any);

    await dispatchAlertAutoAcknowledgedEvent(mockContext);

    // All handlers should be invoked despite handler2 rejecting
    expect(handler1).toHaveBeenCalledWith(mockContext);
    expect(handler3).toHaveBeenCalledWith(mockContext);
  });
});
```

### Integration Testing with Alerts

```typescript
describe('Alert Auto-Acknowledgment Integration', () => {
  it('should complete full acknowledgment workflow', async () => {
    const alert = { id: 'alert-123', status: 'open' };

    // Step 1: Auto-acknowledge
    await dispatchAlertAutoAcknowledgedEvent({
      alertId: alert.id,
      tenant: { id: 'tenant-1', name: 'Test' },
      actor: { id: 'system', type: 'system', name: 'System' },
      correlationId: 'corr-123',
      reason: 'Auto-acked',
      ruleId: 'rule-123',
    });

    // Verify state
    expect(alertStore.recordAcknowledgment).toHaveBeenCalled();

    // Step 2: Complete workflow
    await dispatchAcknowledgmentCompletedEvent({
      alertId: alert.id,
      tenant: { id: 'tenant-1', name: 'Test' },
      actor: { id: 'system', type: 'system', name: 'System' },
      correlationId: 'corr-123',
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    });

    // Verify completion
    expect(auditBuilder.AuditEventBuilder).toHaveBeenCalledWith(
      'ALERT_ACKNOWLEDGMENT_COMPLETED',
      expect.any(Object)
    );
  });
});
```

## Error Handling Strategy

### Missing Alert Handling

If an alert is not found in the store, handlers gracefully return without error:

```typescript
const alert = await alertStore.getAlert(context.alertId);
if (!alert) {
  logger.warn({ alertId: context.alertId }, "Alert not found for auto-acknowledgment event");
  return; // Continue with dispatch to custom handlers
}
```

**Rationale**: Alert may have been deleted or archived. Custom handlers can still process the event for cleanup/notification purposes.

### Custom Handler Failures

Errors in custom handlers are isolated and logged without affecting other handlers:

```typescript
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
```

**Rationale**: One misbehaving handler should not block others or the built-in handler.

### Audit Event Failures

Audit event emission errors are logged but do not prevent state updates:

```typescript
try {
  await auditEventBuilder.emit();
} catch (err: any) {
  logger.error(
    { err, alertId: context.alertId },
    "Failed to emit audit event for auto-acknowledgment"
  );
  // Continue with state update despite audit failure
}
```

**Rationale**: Audit trail loss is less critical than updating alert state.

## Type Definitions

```typescript
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

interface EventHandlerRegistry {
  onAlertAutoAcknowledged: Set<(context: AlertAutoAcknowledgmentContext) => Promise<void>>;
  onAlertEscalated: Set<(context: AlertEscalationContext) => Promise<void>>;
  onAcknowledgmentCompleted: Set<(context: AcknowledgmentCompletionContext) => Promise<void>>;
}
```

## Deployment Checklist

- [ ] Review event handler implementation against business requirements
- [ ] Verify audit logging is enabled and audit events reach compliance systems
- [ ] Test custom handler registration with at least 2 custom handlers
- [ ] Verify error isolation: confirm one failing handler doesn't block others
- [ ] Test missing alert scenario: confirm graceful degradation
- [ ] Run complete test suite: `npm run test -- alert-auto-acknowledgment-handlers`
- [ ] Verify TypeScript compilation: `tsc --noEmit`
- [ ] Check code coverage: ensure 80%+ coverage on all handlers
- [ ] Test escalation severity determination: verify level 1 vs 2+ severity
- [ ] Verify escalation alert creation: check alert store receives escalation alert
- [ ] Test completion event: verify summary alert created only for escalated status
- [ ] Monitor handler performance: ensure dispatch completes within SLA
- [ ] Validate correlation IDs flow through to audit trail
- [ ] Document custom handler registration in runbooks
- [ ] Set up alerts for handler execution failures
- [ ] Plan handler initialization: determine startup order and dependencies
- [ ] Review multi-tenant isolation: verify tenant context flows correctly
- [ ] Test with production-scale alert volumes: verify no memory leaks
