import type { PromptBuildContext } from '../contracts.js';

/**
 * Produces a Markdown-formatted execution state block string derived from the
 * `run` sub-object of the build context.
 *
 * This block is injected into compiled prompts so that the model is aware of
 * the current execution context (run ID, correlation ID, goal, phase, etc.)
 * without needing to embed those fields directly in the template.
 *
 * @param context  The fully-resolved PromptBuildContext.
 * @returns        A Markdown string representing the current execution state.
 */
export function injectExecutionState(context: PromptBuildContext): string {
  const { run, tenant, session } = context;

  const lines: string[] = [
    '## Execution State',
    '',
    `- **Run ID:** \`${run.runId}\``,
    `- **Correlation ID:** \`${run.correlationId}\``,
    `- **Auth Mode:** \`${session.authMode}\``,
    `- **Project:** \`${tenant.projectId}\`${tenant.projectName ? ` (${tenant.projectName})` : ''}`,
    `- **Workspace:** \`${tenant.workspaceId}\``,
    `- **Organisation:** \`${tenant.orgId}\``,
    '',
    '### Goal',
    '',
    run.goal,
  ];

  if (run.currentPhase) {
    lines.push('', `**Current Phase:** ${run.currentPhase}`);
  }

  if (run.priorSummary) {
    lines.push('', '### Prior Run Summary', '', run.priorSummary);
  }

  return lines.join('\n');
}
