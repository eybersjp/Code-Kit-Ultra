import { describe, it, expect } from 'vitest';
import { validateManifest } from './registry/manifest-validator.js';
import { resolveSessionContext } from './context/resolve-session-context.js';
import { resolvePolicyContext } from './context/resolve-policy-context.js';
import { evaluateCapabilities } from './runtime/evaluate-capabilities.js';
import { compilePrompt } from './compiler/compile-prompt.js';
import { injectModeBlock } from './injectors/inject-mode.js';
import type {
  PromptManifest,
  PromptBuildContext,
  PromptMode,
} from './contracts.js';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

function makeValidManifest(overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id: 'test-prompt',
    version: '1.0.0',
    status: 'stable',
    channel: 'development',
    role: 'code-agent',
    title: 'Test Prompt',
    description: 'A test prompt for unit tests.',
    owner: 'test-team',
    template_file: 'system.md',
    capabilities: ['read-files', 'write-files'],
    allowed_context_blocks: ['tenant-session', 'modes/safe'],
    required_context_blocks: [],
    output_schema: 'output-schema.json',
    supported_modes: ['safe', 'balanced'],
    ...overrides,
  };
}

function makeContext(overrides: Partial<PromptBuildContext> = {}): PromptBuildContext {
  return {
    actor: { actorId: 'user-abc123', email: 'test@example.com' },
    tenant: {
      orgId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      projectName: 'Test Project',
    },
    session: {
      authMode: 'session',
      permissions: ['read', 'write'],
      roles: ['developer'],
    },
    policy: {
      riskThreshold: 'medium',
      approvalRequired: false,
      restrictedCapabilities: [],
      allowedAdapters: [],
    },
    run: {
      runId: 'run-xyz',
      correlationId: 'corr-abc',
      goal: 'Implement the feature described in the task.',
    },
    adapters: [],
    mode: 'safe',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('prompt-system', () => {
  // 1. validateManifest – valid
  it('validates manifest with required fields', () => {
    const raw = makeValidManifest();
    const manifest = validateManifest(raw);

    expect(manifest.id).toBe('test-prompt');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.status).toBe('stable');
    expect(manifest.channel).toBe('development');
    expect(manifest.role).toBe('code-agent');
    expect(manifest.template_file).toBe('system.md');
    expect(Array.isArray(manifest.capabilities)).toBe(true);
    expect(Array.isArray(manifest.supported_modes)).toBe(true);
  });

  // 2. validateManifest – invalid (missing required fields)
  it('rejects manifest missing required fields', () => {
    // Missing id, status, channel, role, template_file
    expect(() => validateManifest({ version: '1.0.0' })).toThrow(
      /required field "id" is missing or empty/,
    );

    expect(() =>
      validateManifest(makeValidManifest({ status: 'unknown-status' })),
    ).toThrow(/status.*must be one of/);

    expect(() =>
      validateManifest(makeValidManifest({ channel: 'staging-x' })),
    ).toThrow(/channel.*must be one of/);
  });

  // 3. resolveSessionContext – valid authMode
  it('resolveSessionContext returns correct authMode', () => {
    const result = resolveSessionContext({
      authMode: 'session',
      permissions: ['read'],
      roles: ['admin'],
    });

    expect(result.authMode).toBe('session');
    expect(result.permissions).toEqual(['read']);
    expect(result.roles).toEqual(['admin']);
  });

  it('resolveSessionContext throws for invalid authMode', () => {
    expect(() =>
      resolveSessionContext({
        authMode: 'super-admin',
        permissions: [],
        roles: [],
      }),
    ).toThrow(/invalid authMode/);
  });

  // 4. resolvePolicyContext – safe defaults
  it('resolvePolicyContext applies safe defaults', () => {
    const result = resolvePolicyContext();

    expect(result.riskThreshold).toBe('medium');
    expect(result.approvalRequired).toBe(false);
    expect(result.restrictedCapabilities).toEqual([]);
    expect(result.allowedAdapters).toEqual([]);
  });

  it('resolvePolicyContext respects provided values', () => {
    const result = resolvePolicyContext({
      riskThreshold: 'high',
      approvalRequired: true,
      restrictedCapabilities: ['exec-shell'],
      allowedAdapters: ['filesystem'],
    });

    expect(result.riskThreshold).toBe('high');
    expect(result.approvalRequired).toBe(true);
    expect(result.restrictedCapabilities).toEqual(['exec-shell']);
    expect(result.allowedAdapters).toEqual(['filesystem']);
  });

  // 5. evaluateCapabilities – detects restricted capabilities
  it('evaluateCapabilities detects restricted capabilities', () => {
    const manifest = validateManifest(
      makeValidManifest({ capabilities: ['read-files', 'exec-shell', 'write-db'] }),
    );

    const context = makeContext({
      policy: {
        riskThreshold: 'high',
        approvalRequired: false,
        restrictedCapabilities: ['exec-shell', 'write-db'],
        allowedAdapters: [],
      },
    });

    const result = evaluateCapabilities(manifest, context);

    expect(result.allowed).toBe(false);
    expect(result.restricted).toContain('exec-shell');
    expect(result.restricted).toContain('write-db');
    expect(result.restricted).not.toContain('read-files');
  });

  it('evaluateCapabilities returns allowed when no restrictions overlap', () => {
    const manifest = validateManifest(
      makeValidManifest({ capabilities: ['read-files'] }),
    );
    const context = makeContext({
      policy: {
        riskThreshold: 'medium',
        approvalRequired: false,
        restrictedCapabilities: ['exec-shell'],
        allowedAdapters: [],
      },
    });

    const result = evaluateCapabilities(manifest, context);

    expect(result.allowed).toBe(true);
    expect(result.restricted).toHaveLength(0);
  });

  // 6. compilePrompt – produces fingerprint
  it('compilePrompt produces fingerprint', () => {
    const manifest = validateManifest(makeValidManifest()) as PromptManifest;
    const context = makeContext();
    const templateSource = 'Hello, {{actor.actorId}}! Goal: {{run.goal}}';
    const partials: Record<string, string> = {};

    const artifact = compilePrompt(manifest, templateSource, context, partials);

    expect(artifact.promptId).toBe('test-prompt');
    expect(artifact.version).toBe('1.0.0');
    expect(typeof artifact.fingerprint).toBe('string');
    expect(artifact.fingerprint).toHaveLength(64); // SHA-256 hex
    expect(artifact.compiledPrompt).toContain('user-abc123');
    expect(artifact.compiledPrompt).toContain('Implement the feature');
  });

  it('compilePrompt throws when required context block is missing', () => {
    const manifest = validateManifest(
      makeValidManifest({ required_context_blocks: ['policy/default-policy'] }),
    ) as PromptManifest;

    const context = makeContext();
    const templateSource = 'Hello world';
    const partials: Record<string, string> = {}; // missing required partial

    expect(() =>
      compilePrompt(manifest, templateSource, context, partials),
    ).toThrow(/missing required context blocks/);
  });

  // 7. injectModeBlock – returns correct partial path for each mode
  it('injectModeBlock returns correct partial path for each mode', () => {
    const modes: PromptMode[] = ['safe', 'balanced', 'god'];
    const expected = ['modes/safe', 'modes/balanced', 'modes/god'];

    modes.forEach((mode, i) => {
      expect(injectModeBlock(mode)).toBe(expected[i]);
    });
  });
});
