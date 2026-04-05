import type { PromptBuildContextRun } from '../contracts.js';

/**
 * Resolves and validates a raw run input into a typed PromptBuildContextRun.
 *
 * `runId`, `correlationId`, and `goal` are required fields. `currentPhase` and
 * `priorSummary` are optional and passed through as-is when present.
 *
 * @param raw  Unvalidated run data, typically derived from the orchestrator.
 * @returns    Typed run sub-object for inclusion in PromptBuildContext.
 * @throws     Error listing every missing required field.
 */
export function resolveRunContext(raw: {
  runId: string;
  correlationId: string;
  goal: string;
  currentPhase?: string;
  priorSummary?: string;
}): PromptBuildContextRun {
  const missing: string[] = [];

  if (typeof raw.runId !== 'string' || raw.runId.trim() === '') {
    missing.push('runId');
  }
  if (typeof raw.correlationId !== 'string' || raw.correlationId.trim() === '') {
    missing.push('correlationId');
  }
  if (typeof raw.goal !== 'string' || raw.goal.trim() === '') {
    missing.push('goal');
  }

  if (missing.length > 0) {
    throw new Error(
      `resolveRunContext: missing required fields: [${missing.join(', ')}]`,
    );
  }

  return {
    runId: raw.runId.trim(),
    correlationId: raw.correlationId.trim(),
    goal: raw.goal.trim(),
    ...(typeof raw.currentPhase === 'string' && raw.currentPhase.trim() !== ''
      ? { currentPhase: raw.currentPhase.trim() }
      : {}),
    ...(typeof raw.priorSummary === 'string' && raw.priorSummary.trim() !== ''
      ? { priorSummary: raw.priorSummary.trim() }
      : {}),
  };
}
