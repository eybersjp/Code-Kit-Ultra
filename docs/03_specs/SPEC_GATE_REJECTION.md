# SPEC — Gate Rejection Endpoint

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 9.1 — `POST /v1/gates/{gateId}/reject`
**Unblocks:** T1-3 implementation
**Risk refs:** R-06

---

## Objective

Implement gate rejection as a first-class governance operation. Reviewers with the `gate:reject` permission must be able to explicitly block a gate, halt run progression, and have the decision recorded immutably in the audit trail.

---

## Scope

**In scope:**
- `POST /v1/gates/{gateId}/reject` endpoint
- Permission enforcement (`gate:reject`)
- Run state update (halt progression)
- Audit event emission
- Canonical event publication (`gate.rejected`)
- Web control plane reject button
- CLI `ck gate reject <gateId>` command

**Out of scope:**
- Gate approval (already implemented at `/approvals/:id/approve`)
- Gate re-opening after rejection (not in current spec)

---

## API Contract

```
POST /v1/gates/{gateId}/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "note": "Architecture decision is missing key boundary definitions"  // optional
}

HTTP/1.1 200 OK
{
  "gateId": "gate_abc123",
  "gate": "architecture",
  "status": "rejected",
  "rejectedBy": "user_xyz",
  "rejectedAt": "2026-04-03T10:00:00Z",
  "note": "Architecture decision is missing key boundary definitions",
  "runStatus": "paused"
}

HTTP/1.1 409 Conflict  (if gate already decided)
{
  "error": "Gate gate_abc123 has already been decided (status: approved)"
}

HTTP/1.1 403 Forbidden  (if missing gate:reject permission)
{
  "error": "Forbidden: requires gate:reject permission"
}
```

---

## Implementation

### Handler — `apps/control-service/src/handlers/reject-gate.ts`

```typescript
import type { Request, Response } from 'express';
import { writeAuditEvent } from '@cku/audit';
import { publishEvent } from '@cku/events';
import { getGateById, updateGateDecision } from '../db/gates.js';
import { updateRunStatus } from '../db/runs.js';

export async function rejectGate(req: Request, res: Response) {
  const { gateId } = req.params;
  const { note } = req.body ?? {};
  const auth = req.auth!;

  try {
    const gate = await getGateById(gateId);

    if (!gate) {
      return res.status(404).json({ error: 'Gate not found' });
    }

    // Enforce tenant scope
    if (gate.projectId && auth.tenant.projectId !== gate.projectId) {
      return res.status(403).json({ error: 'Forbidden: out of scope' });
    }

    // 409 if already decided
    if (gate.status === 'approved' || gate.status === 'rejected') {
      return res.status(409).json({
        error: `Gate ${gateId} has already been decided (status: ${gate.status})`,
      });
    }

    const decidedAt = new Date().toISOString();

    // Persist decision
    await updateGateDecision(gateId, {
      status: 'rejected',
      decidedBy: auth.actor.actorId,
      decidedAt,
      decisionNote: note,
    });

    // Halt the run
    await updateRunStatus(gate.runId, 'paused');

    // Audit event
    writeAuditEvent({
      eventType: 'gate.rejected',
      runId: gate.runId,
      actor: auth.actor,
      tenant: auth.tenant,
      authMode: auth.authMode,
      correlationId: auth.correlationId,
      payload: { gateId, gate: gate.gateType, note },
    });

    // Canonical event
    await publishEvent({
      eventName: 'gate.rejected',
      runId: gate.runId,
      actorId: auth.actor.actorId,
      actorType: auth.actor.actorType,
      organizationId: auth.tenant.orgId,
      projectId: auth.tenant.projectId,
      authMode: auth.authMode,
      correlationId: auth.correlationId,
      payload: { gateId, gate: gate.gateType, note, decidedAt },
    });

    return res.status(200).json({
      gateId,
      gate: gate.gateType,
      status: 'rejected',
      rejectedBy: auth.actor.actorId,
      rejectedAt: decidedAt,
      note,
      runStatus: 'paused',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('rejectGate error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Route Registration — `apps/control-service/src/index.ts`

```typescript
import { rejectGate } from './handlers/reject-gate.js';
import { requirePermission } from './middleware/authorize.js';

v1Router.post(
  '/gates/:gateId/reject',
  authenticate,
  requirePermission('gate:reject'),
  rejectGate
);
```

### DB Helper — `apps/control-service/src/db/gates.ts`

```typescript
export async function getGateById(gateId: string): Promise<GateDecision | null>;
export async function updateGateDecision(gateId: string, update: Partial<GateDecision>): Promise<void>;
```

---

## Web Control Plane — `apps/web-control-plane/src/pages/Gates.tsx`

Add a reject button to `GateApprovalCard`:
```tsx
<button
  onClick={() => handleReject(gate.id)}
  className="btn-danger"
>
  Reject
</button>
```

Call `PATCH /v1/gates/{gateId}/reject` with optional note from a modal.

---

## CLI — `apps/cli/src/index.ts`

```
ck gate reject <gateId> [--note "reason"]
```

---

## Dependencies

- `SPEC_API_VERSIONING.md` (routes must be under `/v1/`)
- `SPEC_POSTGRES_PERSISTENCE.md` (gate decisions must be persisted to DB)
- `gate:reject` permission must exist in role-mapping (already defined in `packages/policy/src/role-mapping.ts`)

---

## Edge Cases

- **Gate already decided**: returns 409 Conflict with current status
- **Gate not found**: returns 404
- **Out-of-scope gate**: returns 403 (different project)
- **Run already completed**: gate rejection on a completed run should return 409
- **Concurrent approval and rejection**: use DB transaction or optimistic locking to prevent both succeeding

---

## Risks

- **Race condition**: two reviewers simultaneously approve and reject — mitigate with atomic DB update using `WHERE status = 'pending'`

---

## Definition of Done

- [ ] `POST /v1/gates/{gateId}/reject` returns 200 with decision record
- [ ] Returns 409 if gate is already decided
- [ ] Returns 403 if actor lacks `gate:reject` permission
- [ ] Run status set to `paused` after rejection
- [ ] Audit event `gate.rejected` written with full actor/tenant/correlation context
- [ ] Canonical event `gate.rejected` published via realtime provider
- [ ] Web control plane shows reject button alongside approve button
- [ ] CLI `ck gate reject` command works
- [ ] Tests written for success, 409, 403 cases
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
