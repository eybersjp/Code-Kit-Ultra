import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * QA Gate: Require test coverage delta >= 0 (tests cannot decrease)
 */
export class QAGate extends BaseGate {
  name = 'QA Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { testCoverageDelta } = context;

    if (testCoverageDelta === undefined) {
      return this.warning('Test coverage delta not available');
    }

    if (testCoverageDelta < 0) {
      return this.blocked(
        `Test coverage decreased by ${Math.abs(testCoverageDelta)}%`,
        {
          coverageDelta: testCoverageDelta,
          requirement: '>= 0%',
        }
      );
    }

    return this.pass(
      `Test coverage maintained or improved (+${testCoverageDelta}%)`,
      {
        coverageDelta: testCoverageDelta,
      }
    );
  }
}
