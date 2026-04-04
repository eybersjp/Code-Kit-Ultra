import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Scope Gate: Verify run targets only files within declared project boundary
 */
export class ScopeGate extends BaseGate {
  name = 'Scope Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { run, proposedChanges } = context;

    if (!proposedChanges || proposedChanges.length === 0) {
      return this.pass('No file changes proposed');
    }

    // Project boundaries (simplified - would be defined per project)
    const projectBoundaries: Record<string, string[]> = {
      'proj-api': ['packages/orchestrator', 'packages/auth', 'apps/control-service'],
      'proj-web': ['apps/web-control-plane'],
      'proj-shared': ['packages/shared', 'packages/core'],
    };

    const boundaries = projectBoundaries[run.projectId] || [];

    if (boundaries.length === 0) {
      return this.warning('No scope boundaries defined for this project');
    }

    const outOfScopeFiles = proposedChanges.filter(
      (change) => !boundaries.some((boundary) => change.path?.startsWith(boundary))
    );

    if (outOfScopeFiles.length > 0) {
      return this.blocked(
        `${outOfScopeFiles.length} proposed changes outside project scope`,
        {
          outOfScopeFiles: outOfScopeFiles.map((f) => f.path),
          allowedBoundaries: boundaries,
        }
      );
    }

    return this.pass(`All proposed changes within scope`, {
      filesChecked: proposedChanges.length,
      boundaries,
    });
  }
}
