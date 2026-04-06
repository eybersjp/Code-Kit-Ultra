import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Build Gate: Require build to pass before deployment phase
 */
export class BuildGate extends BaseGate {
  name = 'Build Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { buildOutput } = context;

    if (!buildOutput) {
      return this.blocked('Build output not available', {
        requirement: 'Build must complete successfully',
      });
    }

    if (buildOutput.status === 'failed') {
      return this.blocked('Build failed', {
        buildStatus: buildOutput.status,
        errors: buildOutput.errors,
      });
    }

    if (buildOutput.status === 'success') {
      return this.pass('Build passed successfully', {
        buildStatus: buildOutput.status,
        artifacts: buildOutput.artifacts?.length || 0,
      });
    }

    return this.warning('Build status unknown', {
      buildStatus: buildOutput.status,
    });
  }
}
