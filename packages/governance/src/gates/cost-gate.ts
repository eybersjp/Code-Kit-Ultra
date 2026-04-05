import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Cost Gate: Estimate token/compute cost, block if over budget
 */
export class CostGate extends BaseGate {
  name = 'Cost Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { estimatedCost } = context;

    // Default budget: $100 per run
    const budget = 100;

    if (!estimatedCost) {
      return this.warning('No cost estimate available');
    }

    if (estimatedCost > budget) {
      return this.blocked(`Estimated cost $${estimatedCost} exceeds budget $${budget}`, {
        estimatedCost,
        budget,
        overage: estimatedCost - budget,
      });
    }

    return this.pass(`Estimated cost $${estimatedCost} within budget $${budget}`, {
      estimatedCost,
      budget,
      remaining: budget - estimatedCost,
    });
  }
}
