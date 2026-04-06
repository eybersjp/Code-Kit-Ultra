import type { PromptManifest, PromptStatus, PromptChannel, PromptMode } from '../contracts.js';

const VALID_STATUSES: PromptStatus[] = ['draft', 'stable', 'deprecated'];
const VALID_CHANNELS: PromptChannel[] = ['development', 'staging', 'production'];
const VALID_MODES: PromptMode[] = ['safe', 'balanced', 'god'];

/**
 * Validates an unknown value as a PromptManifest, throwing a descriptive error
 * if any required field is absent or holds an invalid value.
 *
 * @param manifest  The raw parsed JSON (or any unknown value).
 * @returns         The same object cast to PromptManifest.
 * @throws          Error with a human-readable message describing the first violation.
 */
export function validateManifest(manifest: unknown): PromptManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('validateManifest: manifest must be a non-null object');
  }

  const m = manifest as Record<string, unknown>;

  // ── Required string fields ───────────────────────────────────────────────
  const requiredStrings: Array<keyof PromptManifest> = [
    'id',
    'version',
    'status',
    'channel',
    'role',
    'template_file',
  ];

  for (const field of requiredStrings) {
    if (typeof m[field] !== 'string' || (m[field] as string).trim() === '') {
      throw new Error(
        `validateManifest: required field "${field}" is missing or empty`,
      );
    }
  }

  // ── Status enum ──────────────────────────────────────────────────────────
  const status = m['status'] as string;
  if (!VALID_STATUSES.includes(status as PromptStatus)) {
    throw new Error(
      `validateManifest: "status" must be one of [${VALID_STATUSES.join(', ')}], got "${status}"`,
    );
  }

  // ── Channel enum ─────────────────────────────────────────────────────────
  const channel = m['channel'] as string;
  if (!VALID_CHANNELS.includes(channel as PromptChannel)) {
    throw new Error(
      `validateManifest: "channel" must be one of [${VALID_CHANNELS.join(', ')}], got "${channel}"`,
    );
  }

  // ── supported_modes – optional but validated when present ────────────────
  if (m['supported_modes'] !== undefined) {
    if (!Array.isArray(m['supported_modes'])) {
      throw new Error(
        'validateManifest: "supported_modes" must be an array when provided',
      );
    }
    for (const mode of m['supported_modes'] as unknown[]) {
      if (!VALID_MODES.includes(mode as PromptMode)) {
        throw new Error(
          `validateManifest: unsupported mode "${String(mode)}" in supported_modes; valid values are [${VALID_MODES.join(', ')}]`,
        );
      }
    }
  }

  // ── Array fields – default to empty array when absent ────────────────────
  if (m['capabilities'] !== undefined && !Array.isArray(m['capabilities'])) {
    throw new Error('validateManifest: "capabilities" must be an array when provided');
  }
  if (
    m['allowed_context_blocks'] !== undefined &&
    !Array.isArray(m['allowed_context_blocks'])
  ) {
    throw new Error(
      'validateManifest: "allowed_context_blocks" must be an array when provided',
    );
  }
  if (
    m['required_context_blocks'] !== undefined &&
    !Array.isArray(m['required_context_blocks'])
  ) {
    throw new Error(
      'validateManifest: "required_context_blocks" must be an array when provided',
    );
  }

  // Apply safe defaults for optional array fields
  if (!Array.isArray(m['capabilities'])) m['capabilities'] = [];
  if (!Array.isArray(m['allowed_context_blocks'])) m['allowed_context_blocks'] = [];
  if (!Array.isArray(m['required_context_blocks'])) m['required_context_blocks'] = [];
  if (!Array.isArray(m['supported_modes'])) m['supported_modes'] = ['safe', 'balanced'];

  // Apply safe defaults for optional string fields
  if (typeof m['title'] !== 'string') m['title'] = m['id'] as string;
  if (typeof m['description'] !== 'string') m['description'] = '';
  if (typeof m['owner'] !== 'string') m['owner'] = 'unknown';
  if (typeof m['output_schema'] !== 'string') m['output_schema'] = '';

  return m as unknown as PromptManifest;
}
