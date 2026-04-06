# SPEC — Service Account Persistence and Token Lifecycle

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/AUTH_ARCHITECTURE.md`
**Implements:** Master spec Section 8 — Authentication, Authorization, and Tenant Resolution
**Risk refs:** R-03 (tenant bypass), R-10 (weak ID generation), R-14 (in-memory store)

---

## Objective

Fix three critical defects in the service account system: replace the in-memory Map with PostgreSQL persistence, replace `Math.random()` ID generation with `crypto.randomUUID()`, and ensure service account permissions are narrower than human admin permissions by default.

---

## Scope

**In scope:**
- Service account CRUD persistence to PostgreSQL `service_accounts` table
- Cryptographically secure ID generation
- Token issuance and one-time display security model
- Permission scope restrictions for service accounts

**Out of scope:**
- Token rotation (future spec)
- Service account groups or teams (future spec)

---

## Data Model

```typescript
export interface ServiceAccount {
  id: string;              // crypto.randomUUID()
  name: string;
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  scopes: string[];        // permission strings granted to this SA
  createdAt: string;
  createdBy: string;       // actorId of creator
}
```

### Permission Scope Rules

Service account permissions must be **narrower than human admin by default**:

| Human Admin Has | Service Account Default | Note |
|-----------------|------------------------|------|
| run:create | ✅ Allowed | Core automation need |
| run:view | ✅ Allowed | Core automation need |
| gate:view | ✅ Allowed | Needed for polling |
| gate:approve | ❌ Restricted | Must be explicitly granted |
| execution:rollback | ❌ Restricted | Must be explicitly granted |
| policy:manage | ❌ Restricted | Never granted to SA |
| service_account:manage | ❌ Restricted | Never granted to SA |
| audit:view | ✅ Allowed (own runs only) | Scoped by project |

---

## Implementation

### ID Generation Fix — `apps/control-service/src/routes/service-accounts.ts`

```typescript
// BEFORE (insecure):
const id = `sa-${Math.random().toString(36).substring(2, 9)}`;

// AFTER (secure):
import { randomUUID } from 'crypto';
const id = `sa-${randomUUID()}`;
```

### DB Persistence — Replace Map with DB calls

```typescript
// BEFORE:
const saStore: Map<string, ServiceAccount> = new Map();

// AFTER:
import { insertServiceAccount, listServiceAccounts, deleteServiceAccount } from '../db/service-accounts.js';
```

### Route Handlers

```typescript
// List
router.get('/service-accounts',
  authenticate,
  requirePermission('service_account:view'),
  async (req, res) => {
    const accounts = await listServiceAccounts(req.auth!.tenant.orgId);
    res.json({ serviceAccounts: accounts });
  }
);

// Create
router.post('/service-accounts',
  authenticate,
  requirePermission('service_account:manage'),
  async (req, res) => {
    const { name, workspaceId, projectId, scopes } = req.body;

    // Validate requested scopes don't exceed allowed SA permissions
    const allowedScopes = ['run:create', 'run:view', 'run:cancel', 'gate:view', 'execution:view', 'audit:view'];
    const invalidScopes = (scopes ?? []).filter((s: string) => !allowedScopes.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(422).json({ error: `Invalid scopes for service account: ${invalidScopes.join(', ')}` });
    }

    const sa: ServiceAccount = {
      id: `sa-${randomUUID()}`,
      name,
      orgId: req.auth!.tenant.orgId,
      workspaceId,
      projectId,
      scopes: scopes ?? ['run:create', 'run:view', 'gate:view'],
      createdAt: new Date().toISOString(),
      createdBy: req.auth!.actor.actorId,
    };

    await insertServiceAccount(sa);

    const token = ServiceAccountAuth.issueToken(sa);

    writeAuditEvent({
      eventType: 'service_account.created',
      actor: req.auth!.actor,
      tenant: req.auth!.tenant,
      authMode: req.auth!.authMode,
      correlationId: req.auth!.correlationId,
      payload: { serviceAccountId: sa.id, name: sa.name, scopes: sa.scopes },
    });

    res.status(201).json({
      serviceAccount: sa,
      token,
      warning: 'This token will only be shown once. Store it securely.',
    });
  }
);

// Delete
router.delete('/service-accounts/:id',
  authenticate,
  requirePermission('service_account:manage'),
  async (req, res) => {
    await deleteServiceAccount(req.params.id);
    res.status(204).send();
  }
);
```

---

## Definition of Done

- [ ] Service accounts survive server restart (persisted to DB)
- [ ] IDs generated with `crypto.randomUUID()`
- [ ] Service account permissions validated against allowed scope list on creation
- [ ] Audit event `service_account.created` emitted on creation
- [ ] `GET /v1/service-accounts` lists only service accounts for the actor's org
- [ ] `DELETE /v1/service-accounts/:id` deletes from DB with audit trail
- [ ] Tests written for CRUD operations and scope validation
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
