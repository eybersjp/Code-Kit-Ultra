# Auto-Approval Chain Event Handlers

## Overview

The Auto-Approval Chain Handlers system provides event-driven callbacks for the auto-approval workflow. When approval gates are processed (approved, rejected, or when the entire chain completes), these handlers execute business logic such as:

- Audit trail logging via `AuditEventBuilder`
- Run state updates (recording which gates passed/failed)
- Alert creation for failure scenarios
- Custom handler invocation for extensibility

This module integrates with:
- **Run Store** (`packages/memory/src/run-store`) - Persisting run state
- **Alert Management** (`packages/alert-management/src/alert-store`) - Creating failure alerts
- **Audit Builder** (`lib/audit-builder.ts`) - Logging compliance events
- **Logger** (`lib/logger.ts`) - Structured logging

---

## Architecture

### Event Flow

```
Dispatcher.emitGateApproved(context)
    ↓
dispatchGateApprovedEvent(context)
    ├─ onGateApproved() [built-in handler]
    │   ├─ Load run bundle
    │   ├─ Log audit event
    │   └─ Update run state
    │
    └─ [Registered custom handlers...]
        └─ Each handler runs independently
```

### Handler Registry Pattern

The system supports a **plugin architecture** where custom handlers can be registered without modifying core code:

```typescript
// Built-in: Core business logic
await onGateApproved(context);

// Custom: Registered handlers (e.g., webhook triggers, Slack notifications, metrics)
for (const handler of handlerRegistry.onGateApproved) {
  try {
    await handler(context);
  } catch (err) {
    logger.error({ err }, "Custom handler failed");
    // Error isolated — other handlers still run
  }
}
```

**Key principle**: Handler errors are isolated. A failing custom handler does not prevent other handlers or the built-in handler from running.

---

## Handler Reference

### onGateApproved

**Purpose**: Handle gate approval events.

**Behavior**:
1. Load run bundle by `runId`
2. Log audit event with action `GATE_AUTO_APPROVED`
3. Add gate ID to `approvedGates` array in run state (no duplicates)
4. Update run state with new timestamp

**Signature**:
```typescript
export async function onGateApproved(
  context: AutoApprovalEventContext
): Promise<void>
```

**Parameters**:
- `context.runId` - Run identifier
- `context.gateId` - Gate identifier (e.g., "security-gate")
- `context.tenant` - Tenant context (orgId, workspaceId, projectId)
- `context.actor` - Actor information (system service or user)
- `context.correlationId` - Trace ID for request correlation
- `context.metadata` - Optional custom metadata (passed through to audit event)

**Side Effects**:
- Audit event logged
- Run state persisted
- No alerts created (approval is expected outcome)

**Errors**:
- Handles missing run bundle gracefully (logs warning, returns early)
- Logs audit emission errors but does not throw (event handler resilience)

**Example**:
```typescript
await onGateApproved({
  runId: "run-123",
  gateId: "security-gate",
  tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
  actor: { id: "svc-1", type: "system", name: "auto-approval-service" },
  correlationId: "corr-123",
  metadata: { reason: "High coverage met", autoApprovalScore: 95 },
});
```

---

### onGateRejected

**Purpose**: Handle gate rejection events.

**Behavior**:
1. Load run bundle by `runId`
2. Log audit event with action `GATE_REJECTED` and rejection reason
3. Add gate ID to `rejectedGates` array in run state (no duplicates)
4. Create `deployment_failure` alert with severity `high`
5. Update run state with new timestamp

**Signature**:
```typescript
export async function onGateRejected(
  context: AutoApprovalEventContext
): Promise<void>
```

**Parameters**:
Same as `onGateApproved`.

**Alert Schema**:
```typescript
{
  id: `gate-rejection-${runId}-${gateId}-${timestamp}`,
  type: "deployment_failure",
  severity: "high",
  title: `Gate Rejected: ${gateId}`,
  description: `Gate ${gateId} was rejected in run ${runId}`,
  runId,
  gateId,
  isResolved: false,
  createdAt: Date,
  source: "auto-approval-chain",
  metadata: {
    correlationId,
    rejectionReason: context.metadata?.reason,
    actor: context.actor.name,
  },
}
```

**Side Effects**:
- Audit event logged
- Run state persisted
- Alert recorded (oncall/dashboard visibility)

**Errors**:
- Handles missing run bundle gracefully
- Handles alert creation errors gracefully (logs but does not throw)

**Example**:
```typescript
await onGateRejected({
  runId: "run-123",
  gateId: "security-gate",
  tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
  actor: { id: "manual-reviewer", type: "user", name: "alice" },
  correlationId: "corr-123",
  metadata: { reason: "Security vulnerabilities detected" },
});
```

---

### onAutoApprovalChainCompleted

**Purpose**: Handle completion of the entire approval chain.

**Behavior**:
1. Load run bundle by `runId`
2. Log completion audit event with summary stats (total gates, approved count, rejected count, approval rate)
3. Update run state with chain status and completion timestamp
4. Create alert only if chain has rejections:
   - Severity `critical` for `full_failure` (all gates rejected)
   - Severity `high` for `partial_failure` (some gates rejected)
   - No alert for `success` (all gates approved)

**Signature**:
```typescript
export async function onAutoApprovalChainCompleted(
  context: ChainCompletionContext
): Promise<void>
```

**Parameters**:
- `context.runId` - Run identifier
- `context.tenant` - Tenant context
- `context.actor` - Actor information
- `context.correlationId` - Trace ID
- `context.totalGates` - Total number of gates in chain
- `context.approvedGates` - Number of approved gates
- `context.rejectedGates` - Number of rejected gates
- `context.result` - Chain result (`"success" | "partial_failure" | "full_failure"`)
- `context.metadata` - Optional custom metadata

**Alert Schema** (only created if `rejectedGates > 0`):
```typescript
{
  id: `chain-completion-${runId}-${timestamp}`,
  type: "deployment_failure",
  severity: result === "full_failure" ? "critical" : "high",
  title: `Auto-Approval Chain ${result}: ${runId}`,
  description: `Chain completed with ${rejectedGates} rejection(s) out of ${totalGates} gates`,
  runId,
  isResolved: false,
  createdAt: Date,
  source: "auto-approval-chain",
  metadata: {
    correlationId,
    approvedGates,
    rejectedGates,
    approvalRate: `${Math.round((approvedGates / totalGates) * 100)}%`,
  },
}
```

**Side Effects**:
- Audit event logged
- Run state persisted
- Alert recorded (only if rejections exist)

**Example**:
```typescript
await onAutoApprovalChainCompleted({
  runId: "run-123",
  tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
  actor: { id: "svc-1", type: "system", name: "auto-approval-service" },
  correlationId: "corr-123",
  totalGates: 5,
  approvedGates: 4,
  rejectedGates: 1,
  result: "partial_failure",
});
// Alert created: severity="high", 80% approval rate
```

---

## Dispatch Functions

These functions invoke both the built-in handler and all registered custom handlers.

### dispatchGateApprovedEvent

```typescript
export async function dispatchGateApprovedEvent(
  context: AutoApprovalEventContext
): Promise<void>
```

Invokes:
1. `onGateApproved(context)` [built-in]
2. All registered handlers in `handlerRegistry.onGateApproved`

Error handling: Custom handler errors are caught and logged. One failing handler does not prevent others from running.

---

### dispatchGateRejectedEvent

```typescript
export async function dispatchGateRejectedEvent(
  context: AutoApprovalEventContext
): Promise<void>
```

Invokes:
1. `onGateRejected(context)` [built-in]
2. All registered handlers in `handlerRegistry.onGateRejected`

---

### dispatchChainCompletedEvent

```typescript
export async function dispatchChainCompletedEvent(
  context: ChainCompletionContext
): Promise<void>
```

Invokes:
1. `onAutoApprovalChainCompleted(context)` [built-in]
2. All registered handlers in `handlerRegistry.onChainCompleted`

---

## Custom Handler Registration

### registerGateApprovedHandler

```typescript
export function registerGateApprovedHandler(
  handler: (context: AutoApprovalEventContext) => Promise<void>
): void
```

Register a custom handler to be invoked whenever a gate is approved.

**Example** — Send Slack notification:
```typescript
registerGateApprovedHandler(async (context) => {
  await slack.send({
    channel: "#deployments",
    text: `Gate ${context.gateId} approved in run ${context.runId}`,
  });
});
```

---

### registerGateRejectedHandler

```typescript
export function registerGateRejectedHandler(
  handler: (context: AutoApprovalEventContext) => Promise<void>
): void
```

Register a custom handler to be invoked whenever a gate is rejected.

**Example** — Trigger rollback process:
```typescript
registerGateRejectedHandler(async (context) => {
  if (context.metadata?.criticality === "high") {
    await rollback.initiate({
      runId: context.runId,
      gateId: context.gateId,
      reason: context.metadata?.reason,
    });
  }
});
```

---

### registerChainCompletedHandler

```typescript
export function registerChainCompletedHandler(
  handler: (context: ChainCompletionContext) => Promise<void>
): void
```

Register a custom handler to be invoked when the chain completes.

**Example** — Emit metrics:
```typescript
registerChainCompletedHandler(async (context) => {
  await metrics.recordChainCompletion({
    runId: context.runId,
    approvalRate: (context.approvedGates / context.totalGates) * 100,
    result: context.result,
    duration: Date.now() - context.startedAt,
  });
});
```

---

## Handler Registry

Access the handler registry for testing or introspection:

```typescript
export function getHandlerRegistry(): EventHandlerRegistry {
  return handlerRegistry;
}
```

**Registry structure**:
```typescript
interface EventHandlerRegistry {
  onGateApproved: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onGateRejected: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onChainCompleted: Set<(context: ChainCompletionContext) => Promise<void>>;
}
```

**Example** — Clear handlers in tests:
```typescript
beforeEach(() => {
  getHandlerRegistry().onGateApproved.clear();
  getHandlerRegistry().onGateRejected.clear();
  getHandlerRegistry().onChainCompleted.clear();
});
```

---

## Integration Examples

### Complete Workflow Integration

```typescript
import {
  dispatchGateApprovedEvent,
  dispatchGateRejectedEvent,
  dispatchChainCompletedEvent,
  registerGateRejectedHandler,
  type AutoApprovalEventContext,
} from "./auto-approval-chain-handlers";

// 1. Register custom handlers at startup
registerGateRejectedHandler(async (context) => {
  // Custom webhook for failed gates
  await notifyWebhook(`/hooks/gate-rejected`, {
    runId: context.runId,
    gateId: context.gateId,
    reason: context.metadata?.reason,
  });
});

// 2. Dispatch events during approval workflow
async function approvalWorkflow(runId: string) {
  const chain = await loadApprovalChain(runId);
  const results = await evaluateAllGates(chain);

  for (const gate of chain.gates) {
    const approved = results[gate.id];

    if (approved) {
      await dispatchGateApprovedEvent({
        runId,
        gateId: gate.id,
        tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
        actor: { id: "svc", type: "system", name: "auto-approval-service" },
        correlationId: generateCorrelationId(),
      });
    } else {
      await dispatchGateRejectedEvent({
        runId,
        gateId: gate.id,
        tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
        actor: { id: "svc", type: "system", name: "auto-approval-service" },
        correlationId: generateCorrelationId(),
        metadata: { reason: "Coverage threshold not met" },
      });
    }
  }

  // 3. Dispatch completion event
  await dispatchChainCompletedEvent({
    runId,
    totalGates: chain.gates.length,
    approvedGates: Object.values(results).filter(Boolean).length,
    rejectedGates: Object.values(results).filter((v) => !v).length,
    result: /* "success" | "partial_failure" | "full_failure" */,
    tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
    actor: { id: "svc", type: "system", name: "auto-approval-service" },
    correlationId: generateCorrelationId(),
  });
}
```

### Testing Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  dispatchGateApprovedEvent,
  getHandlerRegistry,
  registerGateApprovedHandler,
} from "./auto-approval-chain-handlers";

describe("Custom approval handlers", () => {
  beforeEach(() => {
    // Clear registry between tests
    getHandlerRegistry().onGateApproved.clear();
  });

  it("should invoke custom handlers on gate approval", async () => {
    const customHandler = vi.fn();
    registerGateApprovedHandler(customHandler);

    await dispatchGateApprovedEvent({
      runId: "run-123",
      gateId: "security-gate",
      tenant: { orgId: "org-1", workspaceId: "ws-1", projectId: "proj-1" },
      actor: { id: "svc", type: "system", name: "auto-approval-service" },
      correlationId: "corr-123",
    });

    expect(customHandler).toHaveBeenCalledWith(expect.objectContaining({
      runId: "run-123",
      gateId: "security-gate",
    }));
  });
});
```

---

## Error Handling

All handlers include error resilience:

1. **Missing Run Bundle**: Handler logs warning and returns early. No state update, no alert.
2. **Audit Emission Errors**: Logged but not thrown. Core business logic (state/alert) still executes.
3. **Custom Handler Errors**: Isolated per handler. Error in one handler does not stop others.
4. **Alert Creation Errors**: Logged but not thrown. Run state is still updated.

This design ensures:
- **Graceful degradation** — One system failure (e.g., audit service down) doesn't cascade
- **Handler independence** — Custom handlers can fail without impacting core logic
- **Observability** — All errors are logged with full context

---

## Type Definitions

```typescript
export interface AutoApprovalEventContext {
  runId: string;
  gateId: string;
  tenant: TenantContext;
  actor: { id: string; type: ActorType; name: string };
  correlationId: string;
  metadata?: Record<string, any>;
}

export interface ChainCompletionContext
  extends Omit<AutoApprovalEventContext, "gateId"> {
  totalGates: number;
  approvedGates: number;
  rejectedGates: number;
  result: "success" | "partial_failure" | "full_failure";
}

interface EventHandlerRegistry {
  onGateApproved: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onGateRejected: Set<(context: AutoApprovalEventContext) => Promise<void>>;
  onChainCompleted: Set<(context: ChainCompletionContext) => Promise<void>>;
}
```

---

## Testing

The module includes comprehensive integration tests in `auto-approval-chain-handlers.test.ts`:

- **27 test cases** covering all handlers and dispatch functions
- **Error scenarios**: missing run bundles, audit failures, handler crashes
- **Handler registry**: registration, isolation, multiple handlers
- **Audit logging**: metadata inclusion, rejection reasons
- **Alert creation**: correct severity based on failure type

Run tests with:
```bash
npm run test -- auto-approval-chain-handlers
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Handler registry is initialized before app starts
- [ ] Custom handlers registered at startup (if any)
- [ ] Audit service is configured and accessible
- [ ] Alert store is initialized
- [ ] Run store connectivity verified
- [ ] Error logging configured (e.g., Sentry integration)
- [ ] Load/capacity testing completed (handler concurrency under peak load)
- [ ] Integration tests passing
- [ ] Manual testing: verify audit trail, alerts, and state updates
