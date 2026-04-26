# Prompt System — Claude Code Context

## Quick Overview

The **prompt-system** package provides dynamic prompt generation, compilation, and versioning for the Code Kit Ultra platform. It transforms static Handlebars templates into fully-rendered prompts by injecting context variables (actor, tenant, session, policy, run, memory, adapters), computes deterministic SHA-256 fingerprints for cache keying and audit purposes, and tracks prompt versions with rollback support.

**Core Responsibilities:**
- **Template compilation** — Parse Handlebars templates, inject variables, render final prompts
- **Variable resolution** — Resolve context variables from multiple sources (session, tenant, policy, run, memory, adapters)
- **Versioning** — Track prompt versions, support rollback, maintain version history
- **Registry management** — Load prompt manifests from a central registry, validate structure
- **Fingerprinting** — Compute deterministic SHA-256 hashes for artifact caching and audit trails
- **Capability evaluation** — Check if a prompt supports required capabilities before execution
- **Audit integration** — Log compiled prompts (with context summary) to audit chain

## Architecture

### Package Structure

```
packages/prompt-system/src/
├── index.ts                           # Public API exports
├── contracts.ts                       # Core type definitions (PromptManifest, PromptBuildContext, etc.)
├── types.ts                           # Internal types (ContextBlock, RawInput variants)
├── compiler/
│   ├── compile-prompt.ts              # Main compilation orchestration
│   ├── fingerprint.ts                 # SHA-256 fingerprint computation
│   ├── render-template.ts             # Handlebars template rendering
│   └── merge-blocks.ts                # Context block merging
├── context/
│   ├── resolve-session-context.ts     # Session (auth mode, permissions, roles)
│   ├── resolve-tenant-context.ts      # Tenant (org, workspace, project)
│   ├── resolve-policy-context.ts      # Policy (risk threshold, approval, capabilities)
│   ├── resolve-run-context.ts         # Run (ID, correlation ID, goal, phase, summary)
│   ├── resolve-memory-context.ts      # Memory (past failures, patterns, rejections)
│   └── resolve-adapter-context.ts     # Adapter availability and capabilities
├── injectors/
│   ├── inject-policy.ts               # Policy constraints block
│   ├── inject-insforge.ts             # InsForge audit binding context
│   ├── inject-mode.ts                 # Execution mode context (safe/balanced/god)
│   ├── inject-safety.ts               # Safety constraint injection
│   └── inject-execution-state.ts      # Execution state (current step, history)
├── registry/
│   ├── prompt-registry.ts             # PromptRegistryService (loads from disk)
│   ├── prompt-loader.ts               # Loads manifest and template files
│   └── manifest-validator.ts          # Validates PromptManifest schema
├── runtime/
│   ├── build-runtime-prompt.ts        # PromptRuntime service orchestration
│   ├── select-prompt.ts               # Selects best prompt for a given intent
│   └── evaluate-capabilities.ts       # Checks prompt capabilities
├── audit/
│   └── write-prompt-audit.ts          # Logs compiled prompts to audit chain
├── testing/
│   ├── snapshot-prompt.ts             # Snapshot testing utilities
│   └── validate-output.ts             # Output schema validation
└── prompt-system.test.ts              # Integration tests
```

### Compilation Pipeline

```
1. User requests prompt compilation
   ↓
2. Load PromptManifest from registry (by ID + version)
   ↓
3. Validate manifest structure (schema check)
   ↓
4. Load template file (system.md with Handlebars syntax)
   ↓
5. Resolve all context sources:
   - Session (authMode, permissions, roles)
   - Tenant (orgId, workspaceId, projectId)
   - Policy (riskThreshold, approvalRequired, restrictedCapabilities)
   - Run (runId, correlationId, goal, currentPhase, priorSummary)
   - Memory (recentFailures, successfulPatterns, rejectedApproaches)
   - Adapters (available adapters and their capabilities)
   ↓
6. Inject derived context blocks:
   - Policy constraints (advisory/blocking/audit-only enforcement)
   - InsForge binding (minimal/standard/full audit levels)
   - Mode context (safe/balanced/god execution mode)
   - Safety constraints (capability restrictions)
   - Execution state (current step, history)
   ↓
7. Render Handlebars template with all variables and partials
   ↓
8. Compute SHA-256 fingerprint (identity + content + context)
   ↓
9. Assemble BuiltPromptArtifact (prompt + fingerprint + manifest + contextSummary)
   ↓
10. Log to audit chain (via writePromptAudit)
   ↓
11. Return compiled artifact
```

## Key Concepts

### PromptManifest

Every prompt has a manifest that describes its identity, capabilities, and configuration:

```typescript
interface PromptManifest {
  id: string;                               // Unique prompt identifier
  version: string;                          // Semantic version (e.g., "1.0.0")
  status: 'draft' | 'stable' | 'deprecated';
  channel: 'development' | 'staging' | 'production';
  role: string;                             // Role (e.g., "security-reviewer", "approver")
  title: string;
  description: string;
  owner: string;                            // Owner email or team
  capabilities: string[];                   // List of capabilities (e.g., ["risk-analysis", "approval-decision"])
  allowed_context_blocks: string[];         // Blocks available to the template
  required_context_blocks: string[];        // Blocks that MUST be present
  output_schema: string;                    // JSON schema for expected output
  template_file: string;                    // Path to system.md
  supported_modes: PromptMode[];            // Supported modes (safe, balanced, god)
  min_runtime_version?: string;
  policy_binding?: {
    policyId: string;
    enforcementLevel: 'advisory' | 'blocking' | 'audit-only';
    riskThreshold?: string;
  };
  insforge_binding?: {
    bindingId: string;
    auditLevel: 'minimal' | 'standard' | 'full';
    captureTokenUsage?: boolean;
  };
  audit?: {
    enabled: boolean;
    captureContext: boolean;
    captureOutput: boolean;
    retentionDays?: number;
  };
}
```

### PromptBuildContext

The complete context passed to the compiler, assembled from multiple sources:

```typescript
interface PromptBuildContext {
  actor: {
    actorId: string;
    email?: string;
    name?: string;
  };
  tenant: {
    orgId: string;
    workspaceId: string;
    projectId: string;
    projectName?: string;
  };
  session: {
    authMode: 'session' | 'service-account' | 'legacy-dev';
    permissions: string[];
    roles: string[];
  };
  policy: {
    riskThreshold: string;
    approvalRequired: boolean;
    restrictedCapabilities: string[];
    allowedAdapters: string[];
  };
  run: {
    runId: string;
    correlationId: string;
    goal: string;
    currentPhase?: string;
    priorSummary?: string;
  };
  mode?: PromptMode;  // safe | balanced | god (defaults to 'safe')
  memory?: {
    recentFailures: string[];
    successfulPatterns: string[];
    rejectedApproaches: string[];
  };
  adapters?: {
    [adapterName: string]: {
      available: boolean;
      capabilities: string[];
    };
  };
}
```

### BuiltPromptArtifact

The immutable compiled output:

```typescript
interface BuiltPromptArtifact {
  promptId: string;
  version: string;
  compiledPrompt: string;          // Final rendered prompt text
  fingerprint: string;              // SHA-256 hex digest
  manifest: PromptManifest;
  contextSummary: {
    actorId: string;
    orgId: string;
    workspaceId: string;
    projectId: string;
    runId: string;
    correlationId: string;
    authMode: 'session' | 'service-account' | 'legacy-dev';
    mode: PromptMode;
    channel: PromptChannel;
    restrictedCapabilities: string[];
    approvalRequired: boolean;
  };
}
```

### Fingerprinting

Fingerprints are deterministic SHA-256 hashes computed from:
- Prompt identity (ID + version)
- Compiled prompt text
- Key context fields (actorId, orgId, workspaceId, projectId, runId, correlationId, goal, authMode, roles, riskThreshold, approvalRequired)

Fingerprints are used for:
- **Cache keying** — Quickly detect if a prompt has been compiled before with the same context
- **Audit trails** — Link compiled prompts to specific contexts
- **Snapshot regression testing** — Detect unintended changes in compiled output
- **Integrity verification** — Ensure artifacts haven't been tampered with

```typescript
const fingerprint = computePromptFingerprint(
  manifest.id,
  manifest.version,
  compiledPrompt,
  context
);
// Returns: "abc123def456..." (hex-encoded SHA-256)
```

## Variable Resolution

### Context Sources (Priority Order)

Context resolvers validate and merge input from multiple sources:

1. **Session Context** — Auth mode, permissions, roles (from JWT or session store)
2. **Tenant Context** — Organization, workspace, project IDs (from request)
3. **Policy Context** — Risk threshold, approval flag, restricted capabilities (from policy.json)
4. **Run Context** — Run ID, correlation ID, goal, current phase, prior summary (from orchestrator)
5. **Memory Context** — Recent failures, successful patterns, rejected approaches (from learning loop)
6. **Adapter Context** — Available adapters and their capabilities (from skill-engine registry)

Each resolver is a pure function that validates input and returns a typed sub-context:

```typescript
// Example: resolve run context
const runContext = resolveRunContext({
  runId: 'run-123',
  correlationId: 'corr-456',
  goal: 'Deploy to prod',
  currentPhase: 'validation',
  priorSummary: 'Previous attempt failed due to...'
});
// Returns: { runId, correlationId, goal, currentPhase, priorSummary }
```

### Context Injection

After resolving raw inputs, **injectors** derive additional context blocks:

- **Policy Block** — Constrains prompt based on risk threshold and approval requirements
- **InsForge Block** — Audit binding and context (for logging to InsForge)
- **Mode Block** — Execution mode hints (safe/balanced/god affect prompt aggressiveness)
- **Safety Constraints** — Restrict capabilities based on policy
- **Execution State** — Current step count, execution history, previous outcomes

Example:

```typescript
const policyBlock = injectPolicyBlock(context.policy);
// Returns: { riskLevel, approvalGate, restrictedActions, ... }
```

## Template Format (Handlebars)

Prompts use Handlebars syntax for variable interpolation, conditionals, and loops:

```handlebars
You are a {{role}} evaluating execution intent: "{{run.goal}}"

Context:
- Tenant: {{tenant.projectName}} ({{tenant.projectId}})
- Mode: {{mode}}
- Auth: {{session.authMode}} (roles: {{#each session.roles}}{{this}}{{/each}})

Policy Constraints:
{{#if policy.approvalRequired}}
  This execution requires approval before proceeding.
{{/if}}

Restricted Capabilities:
{{#each policy.restrictedCapabilities}}
  - {{this}}
{{/each}}

Previous Attempts:
{{#if memory.recentFailures}}
  {{#each memory.recentFailures}}
    - Failed: {{this}}
  {{/each}}
{{else}}
  (No prior failures)
{{/if}}

Decision Rule:
{{decision_rule}}
```

Variables available in templates:
- All fields from PromptBuildContext (actor, tenant, session, policy, run, mode, memory, adapters)
- Injected blocks (policy, insforge, mode, safety, executionState)
- User-provided variables (custom context)

## Versioning & Registry

### Registry Structure

Prompts are registered in `prompts/registry/prompt-registry.json`:

```json
{
  "prompts": [
    {
      "promptId": "security-reviewer",
      "activeVersion": "1.2.3",
      "availableVersions": ["1.0.0", "1.1.0", "1.2.0", "1.2.3"],
      "status": "stable",
      "metadata": { "owner": "security-team@company.com" }
    },
    {
      "promptId": "approver",
      "activeVersion": "2.0.0",
      "availableVersions": ["1.0.0", "2.0.0"],
      "status": "stable",
      "metadata": { "owner": "governance-team@company.com" }
    }
  ]
}
```

### Version Management

Each prompt version is a self-contained artifact:
- **Manifest** — `prompts/manifests/{promptId}/{version}/manifest.json`
- **Template** — `prompts/manifests/{promptId}/{version}/system.md`
- **Output schema** — `prompts/manifests/{promptId}/{version}/output.schema.json`

**Active version** is set in the registry; all requests use the active version unless explicitly specifying a version.

**Rollback** — Set activeVersion to a prior version in the registry and restart the service.

Example:

```typescript
// Load the active version
const activeVersion = await promptRegistry.getActiveVersion('security-reviewer');
// Returns: "1.2.3"

// Get the registry entry (includes available versions)
const entry = await promptRegistry.getRegistryEntry('security-reviewer');
// Returns: { promptId, activeVersion, availableVersions, status, metadata }

// Load a specific version (for rollback testing)
const manifest = await promptLoader.loadManifest('security-reviewer', '1.1.0');
const template = await promptLoader.loadTemplate('security-reviewer', '1.1.0');
```

## Testing Patterns

### Unit Tests

Test individual functions in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveRunContext } from '../context/resolve-run-context';

describe('resolveRunContext', () => {
  it('validates required fields', () => {
    expect(() => resolveRunContext({
      runId: '',  // invalid: empty
      correlationId: 'corr-123',
      goal: 'Deploy'
    })).toThrow('missing required fields: [runId]');
  });

  it('trims whitespace and returns typed context', () => {
    const result = resolveRunContext({
      runId: '  run-123  ',
      correlationId: 'corr-456',
      goal: 'Deploy to prod',
      currentPhase: '  validation  '
    });
    
    expect(result.runId).toBe('run-123');
    expect(result.currentPhase).toBe('validation');
  });
});
```

### Integration Tests

Test compilation end-to-end:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRuntime } from '../runtime/build-runtime-prompt';

describe('PromptRuntime', () => {
  let runtime: PromptRuntime;

  beforeEach(() => {
    runtime = new PromptRuntime();
  });

  it('compiles a prompt with full context', async () => {
    const artifact = await runtime.compile('security-reviewer', '1.0.0', {
      actor: { actorId: 'user-123', email: 'user@example.com' },
      tenant: {
        orgId: 'org-123',
        workspaceId: 'ws-456',
        projectId: 'proj-789'
      },
      session: {
        authMode: 'session',
        permissions: ['execute:deploy'],
        roles: ['engineer']
      },
      policy: {
        riskThreshold: 'medium',
        approvalRequired: false,
        restrictedCapabilities: [],
        allowedAdapters: ['gpt-4']
      },
      run: {
        runId: 'run-999',
        correlationId: 'corr-111',
        goal: 'Deploy to staging'
      }
    });

    expect(artifact.promptId).toBe('security-reviewer');
    expect(artifact.compiledPrompt).toContain('Deploy to staging');
    expect(artifact.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

### Snapshot Testing

Capture and regression-test compiled outputs:

```typescript
import { describe, it, expect } from 'vitest';
import { snapshotPrompt } from '../testing/snapshot-prompt';

describe('Prompt snapshots', () => {
  it('security-reviewer prompt renders consistently', async () => {
    const snapshot = await snapshotPrompt('security-reviewer', '1.0.0', {
      // Full context
    });

    expect(snapshot).toMatchSnapshot();
  });
});
```

## Gotchas

### 1. Variable Injection & Template Syntax

**Gotcha:** Handlebars curly braces clash with JSON, regex, and code blocks.

**Solution:** Escape with triple braces or use raw blocks:
```handlebars
{{! This is a comment }}
{{#raw}}
  const regex = /^\d{3}/;  {{! Safe in raw blocks }}
{{/raw}}
```

### 2. Circular References in Conditionals

**Gotcha:** If templates reference context fields that reference back to templates, infinite loops can occur.

**Solution:** Keep templates and context acyclic; use injectors to flatten context.

### 3. Missing Required Context Blocks

**Gotcha:** If a manifest declares a required context block but the template doesn't define it, compilation fails.

**Solution:** Use `assertRequiredBlocks()` before rendering; validate in tests.

### 4. Fingerprint Instability

**Gotcha:** If context is mutable and gets modified between compilations, fingerprints will differ unexpectedly.

**Solution:** Use immutable context objects (spread operators, Object.freeze for testing).

### 5. Registry Cache Invalidation

**Gotcha:** Changes to `prompts/registry/prompt-registry.json` or manifest files are cached in-memory; service restart required.

**Solution:** Use `promptRegistry.invalidateCache()` in tests; document cache invalidation in deployment guides.

### 6. Mode Fallback

**Gotcha:** If context.mode is undefined, it silently defaults to 'safe' without warning.

**Solution:** Always set mode explicitly in context builders; add logging for defaults.

### 7. Version Not Found

**Gotcha:** If a manifest version doesn't exist, `promptLoader` throws cryptic error paths.

**Solution:** Validate available versions in registry before loading; provide user-friendly error messages.

### 8. Audit Logging Failures

**Gotcha:** If InsForge is unreachable during `writePromptAudit()`, compilation succeeds but audit fails silently.

**Solution:** Log audit failures and implement retry/fallback logic; alert on InsForge unavailability.

## Cross-References

**Depends on:**
- [`@cku/shared`](../shared/CLAUDE.md) — Logger, types
- Handlebars (templating library)
- AJV (JSON schema validation)

**Used by:**
- [`packages/governance`](../governance/CLAUDE.md) — Compiles prompts for gate decisions
- [`packages/orchestrator`](../orchestrator/CLAUDE.md) — Uses prompts in step execution context
- [`apps/control-service`](../../apps/control-service/CLAUDE.md) — API endpoints for prompt compilation

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md)
- [System Architecture](../../docs/ARCHITECTURE.md)
- [Testing Guide](../../docs/TESTING.md)
- [Config Schema](../../docs/CONFIG_SCHEMA.md)
