import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Launch Gate: Final human approval before any production change
 */
export class LaunchGate extends BaseGate {
  name = 'Launch Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { mode } = context;

    // Production deployments always require human approval
    if (mode === 'expert' || mode === 'god') {
      return this.fail(
        'Final human approval required before proceeding',
        { requirement: 'Expert or God mode requires explicit approval' },
        true // requiresReview
      );
    }

    return this.pass('Launch gate cleared (non-production mode)', {
      mode,
    });
  }
}
