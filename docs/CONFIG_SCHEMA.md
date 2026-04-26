# Configuration Schema Reference

## Overview

Code Kit Ultra uses a hierarchical configuration system centered on `config/policy.json`, which governs:
- **Execution modes** — dev, staging, prod behavior
- **Governance gates** — 9 gate sequences and thresholds
- **Role-based access control (RBAC)** — Permissions and role definitions
- **Consensus configuration** — Agent voting weights and veto rules
- **Feature flags** — Optional feature toggles

This document fully describes the `policy.json` schema, mode-specific overrides, and common configuration scenarios.

---

## policy.json Schema

### Root Structure

```json
{
  "version": "1.0",
  "mode": "balanced",
  "restrictions": [
    {
      "adapterId": "terminal",
      "blacklist": ["rm -rf /", "mkfs"],
      "requiresApproval": true
    },
    {
      "adapterId": "github",
      "requiresApproval": true
    },
    {
      "adapterId": "file-system",
      "requiresApproval": false
    }
  ],
  "globalApprovalRequired": false
}
```

### Field Descriptions

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `version` | string | Yes | Schema version | "1.0" |
| `mode` | string | Yes | Execution mode (see modes below) | "balanced" |
| `restrictions` | array | Yes | Adapter-level restrictions | [] |
| `globalApprovalRequired` | boolean | No | Require approval for all operations | false |

### Restrictions Array

Each restriction controls behavior for a specific adapter (terminal, github, file-system, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `adapterId` | string | Adapter identifier (terminal, github, file-system, kubernetes, docker, etc.) |
| `blacklist` | string[] | Commands/operations forbidden (even with approval) |
| `whitelist` | string[] | If present, ONLY these operations allowed (whitelist mode) |
| `requiresApproval` | boolean | All operations require explicit approval |

#### Examples

**Restrictive Terminal (Prod)**
```json
{
  "adapterId": "terminal",
  "blacklist": ["rm -rf /", "mkfs", "dd", "shutdown", "reboot", "sudo"],
  "requiresApproval": true
}
```

**Permissive File System (Dev)**
```json
{
  "adapterId": "file-system",
  "requiresApproval": false
}
```

**GitHub with Whitelist (Staging)**
```json
{
  "adapterId": "github",
  "whitelist": ["pull", "list-branches", "view-pr"],
  "requiresApproval": true
}
```

---

## Execution Modes

Execution mode controls gate sequences and enforcement strictness. Set via `CODEKIT_PROFILE` environment variable or `config/policy.json`.

### Mode Reference Table

| Mode | Gates Evaluated | Approval Required | Speed | Use Case |
|------|-----------------|-------------------|-------|----------|
| `local-safe` | All 9 gates | Pause on issues | Slow | Local dev, strict review |
| `dev` | All 9 gates | Pause on issues | Slow | Development environment |
| `staging` | 8 gates (skip Cost) | Pause on critical | Medium | Pre-production testing |
| `balanced` | 8 gates (skip Cost) | Pause on critical | Medium | Default production |
| `turbo` | Risk Threshold only | Block only | Fast | Emergency/urgent runs |
| `expert` | All 9 gates | Launch gate approval | Medium | Advanced operators |
| `god` | None | None | Fastest | Bypass (use sparingly) |

### Gate Sequences by Mode

**local-safe / dev (Strictest)**
1. Scope Gate — Tenant/workspace boundaries
2. Architecture Gate — System constraints
3. Security Gate — Auth, RBAC
4. QA Gate — Test coverage, linting
5. Build Gate — Build artifacts
6. Deployment Gate — Target readiness
7. Launch Gate — Final checkpoint (pause)
8. Risk Threshold Gate — Overall risk score
9. Cost Gate — Optional budget checks

**staging / balanced (Default)**
- Same as above, excluding Cost Gate

**turbo (Fastest)**
- Risk Threshold Gate only

**expert (Advanced)**
- All 9 gates, but Launch Gate is approval-only (doesn't pause)

**god (Unrestricted)**
- No gates evaluated

---

## Role-Based Access Control (RBAC)

Roles define which operations a user/service account can perform. Roles map to permissions.

### Built-in Roles

#### Admin
Full system access. Manage all resources, approve/reject gates, modify policies.

**Permissions:**
```typescript
"run:create", "run:view", "run:cancel",
"gate:view", "gate:approve", "gate:reject",
"execution:view", "execution:high_risk", "execution:rollback",
"healing:invoke",
"policy:view", "policy:manage",
"audit:view",
"service_account:manage", "service_account:view",
"automation:view", "automation:manage"
```

#### Operator
Execute runs, approve gates, trigger healing. No policy changes.

**Permissions:**
```typescript
"run:create", "run:view", "run:cancel",
"gate:view", "gate:approve",
"execution:view", "execution:high_risk",
"healing:invoke",
"policy:view",
"automation:view", "automation:manage"
```

#### Reviewer
Review and approve gates. View runs and audit logs. No execution.

**Permissions:**
```typescript
"run:view",
"gate:view", "gate:approve", "gate:reject",
"execution:view",
"policy:view",
"audit:view",
"automation:view"
```

#### Viewer
Read-only access to runs, gates, execution logs, audit trail.

**Permissions:**
```typescript
"run:view",
"gate:view",
"execution:view",
"policy:view",
"audit:view",
"automation:view"
```

#### Service Account
For automation: create/run workflows, no policy management.

**Permissions:**
```typescript
"run:create", "run:view", "run:cancel",
"gate:view", "gate:approve",
"execution:view", "execution:high_risk",
"healing:invoke",
"automation:view", "automation:manage"
```

### Custom Role Creation

To add a custom role (e.g., `data-engineer`), extend the policy configuration:

```json
{
  "mode": "balanced",
  "roles": {
    "data-engineer": {
      "permissions": [
        "run:create",
        "run:view",
        "execution:view",
        "audit:view"
      ],
      "description": "Can create/view data pipeline runs"
    }
  }
}
```

Then assign users via auth/InsForge integration:
```typescript
// In auth middleware
const userRole = extractRoleFromToken(jwt)
const permissions = ROLE_PERMISSIONS[userRole]
```

---

## Consensus Configuration

Governance gates use **adaptive consensus** voting among agents (reviewer, security, automation) to make decisions.

### Agent Profiles

Agents have weights and veto authority. Default profiles from `packages/agents/src/profiles.ts`:

```typescript
const agents = {
  human_reviewer: {
    weight: 2.0,           // High influence
    vetoes: ['execute:high-risk'],
    reliability: 0.95
  },
  security_agent: {
    weight: 1.5,           // Medium-high influence
    vetoes: ['execute:security-risk'],
    reliability: 0.98
  },
  automation_agent: {
    weight: 1.0,           // Standard influence
    vetoes: [],            // No veto authority
    reliability: 0.85
  }
}
```

### Consensus Thresholds

Determine when an approval counts as "consensus":

```json
{
  "consensus": {
    "approvalThreshold": 0.66,
    "vetoOnDisagreement": true,
    "minVotes": 2
  }
}
```

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `approvalThreshold` | float (0-1) | Fraction of weighted votes required | 0.66 |
| `vetoOnDisagreement` | boolean | If true, any veto blocks approval | true |
| `minVotes` | integer | Minimum agent votes needed | 2 |

### Example: Strict Consensus (Prod)

```json
{
  "consensus": {
    "approvalThreshold": 0.80,
    "vetoOnDisagreement": true,
    "minVotes": 3
  }
}
```

Requires 80% weighted approval AND no vetoes AND at least 3 agents voting.

---

## Gate Sequences (Mode-Specific)

Each mode executes a specific gate sequence. Gates can be customized per mode.

### Full Gate List

| Gate | Description | Severity Levels |
|------|-------------|-----------------|
| Scope Gate | Validate execution within tenant/workspace | pass / warning / blocked |
| Architecture Gate | Check system architecture constraints | pass / fail / blocked |
| Security Gate | Auth validation, RBAC checks | pass / fail / blocked |
| Cost Gate | Check budget limits (optional) | pass / warning / fail |
| Deployment Gate | Verify deployment target readiness | pass / fail / blocked |
| QA Gate | Check test coverage, code quality | pass / fail / blocked |
| Build Gate | Validate build artifacts | pass / fail / blocked |
| Launch Gate | Final pre-execution checkpoint | pass / fail / blocked |
| Risk Threshold Gate | Evaluate overall risk score | pass / warning / blocked |

### Gate Configuration Example

```json
{
  "gates": {
    "local-safe": {
      "sequence": [
        "scope",
        "architecture",
        "security",
        "qa",
        "build",
        "deployment",
        "launch",
        "risk-threshold",
        "cost"
      ],
      "thresholds": {
        "security": { "failOnWarning": true },
        "qa": { "minCoverage": 0.80 },
        "risk": { "maxScore": 0.50 }
      }
    },
    "staging": {
      "sequence": [
        "scope",
        "architecture",
        "security",
        "qa",
        "build",
        "deployment",
        "launch",
        "risk-threshold"
      ],
      "thresholds": {
        "security": { "failOnWarning": false },
        "qa": { "minCoverage": 0.75 },
        "risk": { "maxScore": 0.70 }
      }
    },
    "balanced": {
      "sequence": [
        "scope",
        "architecture",
        "security",
        "qa",
        "build",
        "deployment",
        "launch",
        "risk-threshold"
      ]
    },
    "turbo": {
      "sequence": ["risk-threshold"]
    }
  }
}
```

---

## Feature Flags

Enable/disable experimental features at runtime (no service restart required).

```json
{
  "features": {
    "adaptiveConsensus": true,
    "learningLoop": true,
    "selfHealing": true,
    "metricsCollectionEnabled": true,
    "realtimeNotifications": true,
    "experimentalOptimizations": false
  }
}
```

| Feature | Description | Default |
|---------|-------------|---------|
| `adaptiveConsensus` | Enable weighted agent voting for gates | true |
| `learningLoop` | Enable outcome-driven policy learning | true |
| `selfHealing` | Enable automatic remediation on failures | true |
| `metricCollectionEnabled` | Enable Prometheus metrics export | true |
| `realtimeNotifications` | Enable WebSocket event broadcasts | true |
| `experimentalOptimizations` | Enable experimental performance features | false |

---

## Complete Example: Prod Policy

```json
{
  "version": "1.0",
  "mode": "balanced",
  "globalApprovalRequired": false,
  "restrictions": [
    {
      "adapterId": "terminal",
      "blacklist": [
        "rm -rf /",
        "mkfs",
        "dd",
        "shutdown",
        "reboot",
        "sudo",
        "kill -9"
      ],
      "requiresApproval": true
    },
    {
      "adapterId": "github",
      "whitelist": [
        "pull",
        "view-pr",
        "list-branches",
        "merge-pr"
      ],
      "requiresApproval": true
    },
    {
      "adapterId": "kubernetes",
      "whitelist": [
        "rollout-restart",
        "scale",
        "describe",
        "logs"
      ],
      "requiresApproval": true
    },
    {
      "adapterId": "file-system",
      "blacklist": ["/etc/", "/sys/", "/proc/"],
      "requiresApproval": false
    }
  ],
  "gates": {
    "balanced": {
      "sequence": [
        "scope",
        "architecture",
        "security",
        "qa",
        "build",
        "deployment",
        "launch",
        "risk-threshold"
      ],
      "thresholds": {
        "security": { "failOnWarning": true },
        "qa": { "minCoverage": 0.85 },
        "risk": { "maxScore": 0.60 }
      }
    }
  },
  "consensus": {
    "approvalThreshold": 0.75,
    "vetoOnDisagreement": true,
    "minVotes": 2
  },
  "roles": {
    "platform-admin": {
      "permissions": [
        "run:create",
        "run:view",
        "run:cancel",
        "gate:view",
        "gate:approve",
        "gate:reject",
        "execution:view",
        "execution:high_risk",
        "execution:rollback",
        "healing:invoke",
        "policy:view",
        "policy:manage",
        "audit:view",
        "service_account:manage",
        "service_account:view"
      ]
    },
    "sre": {
      "permissions": [
        "run:create",
        "run:view",
        "execution:view",
        "execution:high_risk",
        "healing:invoke",
        "audit:view"
      ]
    }
  },
  "features": {
    "adaptiveConsensus": true,
    "learningLoop": true,
    "selfHealing": true,
    "metricCollectionEnabled": true,
    "realtimeNotifications": true,
    "experimentalOptimizations": false
  }
}
```

---

## Complete Example: Dev Policy (Lenient)

```json
{
  "version": "1.0",
  "mode": "local-safe",
  "globalApprovalRequired": false,
  "restrictions": [
    {
      "adapterId": "terminal",
      "requiresApproval": false
    },
    {
      "adapterId": "github",
      "requiresApproval": false
    },
    {
      "adapterId": "file-system",
      "requiresApproval": false
    }
  ],
  "gates": {
    "local-safe": {
      "sequence": [
        "scope",
        "architecture",
        "security",
        "qa",
        "build",
        "deployment",
        "launch",
        "risk-threshold",
        "cost"
      ],
      "thresholds": {
        "security": { "failOnWarning": false },
        "qa": { "minCoverage": 0.60 },
        "risk": { "maxScore": 0.90 }
      }
    }
  },
  "consensus": {
    "approvalThreshold": 0.50,
    "vetoOnDisagreement": false,
    "minVotes": 1
  },
  "features": {
    "adaptiveConsensus": true,
    "learningLoop": false,
    "selfHealing": true,
    "metricCollectionEnabled": true,
    "realtimeNotifications": false,
    "experimentalOptimizations": true
  }
}
```

---

## Environment-Based Configuration

Override policy.json per environment via environment variables:

```bash
# Production (strict)
export CODEKIT_PROFILE=balanced
export CODEKIT_POLICY_FILE=config/policy.prod.json

# Staging (balanced)
export CODEKIT_PROFILE=balanced
export CODEKIT_POLICY_FILE=config/policy.staging.json

# Development (lenient)
export CODEKIT_PROFILE=local-safe
export CODEKIT_POLICY_FILE=config/policy.dev.json
```

Load configuration in control-service:
```typescript
const policyPath = process.env.CODEKIT_POLICY_FILE || 'config/policy.json'
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'))
```

---

## Reload Behavior

**IMPORTANT:** Changes to `config/policy.json` require **service restart** to take effect.

The control-service reads policy once on startup and caches it. Hot-reload is not supported.

### Deploying Policy Changes

```bash
# 1. Update config/policy.json
vim config/policy.json

# 2. Commit and push
git add config/policy.json
git commit -m "ops: update governance policy thresholds"
git push

# 3. Restart control-service
docker compose restart control-service
# OR
pkill -f "control-service" && pnpm run dev:service

# 4. Verify new policy loaded
curl http://localhost:7474/config | jq .policy
```

---

## Common Configuration Scenarios

### Scenario 1: Strict Production Policy

**Goal:** Enforce comprehensive gate evaluation, require consensus, blacklist dangerous operations.

```json
{
  "mode": "balanced",
  "globalApprovalRequired": false,
  "restrictions": [
    {
      "adapterId": "terminal",
      "blacklist": ["rm", "dd", "shutdown"],
      "requiresApproval": true
    }
  ],
  "gates": {
    "balanced": {
      "thresholds": {
        "security": { "failOnWarning": true },
        "qa": { "minCoverage": 0.90 }
      }
    }
  },
  "consensus": {
    "approvalThreshold": 0.80,
    "vetoOnDisagreement": true
  }
}
```

### Scenario 2: Developer-Friendly Policy

**Goal:** Minimize friction for local development while maintaining basic safety.

```json
{
  "mode": "local-safe",
  "globalApprovalRequired": false,
  "restrictions": [
    {
      "adapterId": "terminal",
      "requiresApproval": false
    },
    {
      "adapterId": "github",
      "requiresApproval": false
    }
  ],
  "gates": {
    "local-safe": {
      "thresholds": {
        "qa": { "minCoverage": 0.50 }
      }
    }
  },
  "consensus": {
    "approvalThreshold": 0.50,
    "vetoOnDisagreement": false
  }
}
```

### Scenario 3: Custom Consensus Thresholds

**Goal:** Adjust voting weights for organizational risk tolerance.

```json
{
  "consensus": {
    "approvalThreshold": 0.65,
    "vetoOnDisagreement": false,
    "minVotes": 1
  }
}
```

This allows a single security agent to approve (1 vote) if weighted vote ≥ 0.65, and veto authority is disabled (higher throughput, lower safety).

---

## Validation and Debugging

### Validate Policy Syntax

```bash
# Use jsonschema or jq to validate
jq empty config/policy.json
echo $?  # 0 = valid JSON
```

### Check Loaded Policy

```bash
# Query control-service for current policy
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:7474/api/config/policy | jq .

# Check mode
curl http://localhost:7474/health | jq .policy.mode
```

### Debug Gate Evaluation

Enable debug logging:
```bash
DEBUG=cku:gates:* pnpm run dev:service
```

### Test Role Permissions

```bash
# Verify a role has a permission
curl -X POST http://localhost:7474/api/policy/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "role": "operator",
    "permission": "execution:high_risk"
  }' | jq .
```

---

## Cross-References

**Related Documentation:**
- [Root CLAUDE.md](../CLAUDE.md) — Environment variables, setup
- [Governance Package](../packages/governance/CLAUDE.md) — 9 gates, gate manager, mode sequences
- [Policy Package](../packages/policy/CLAUDE.md) — RBAC, permission resolution
- [System Architecture](./ARCHITECTURE.md) — Request flow, gate evaluation pipeline

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-26 | Initial schema: modes, gates, RBAC, consensus, restrictions |
