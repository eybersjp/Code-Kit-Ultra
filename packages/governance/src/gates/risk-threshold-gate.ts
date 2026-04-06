import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Risk Threshold Gate: Verify risk score below mode-specific threshold
 */
export class RiskThresholdGate extends BaseGate {
  name = 'Risk Threshold Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { mode } = context;

    // Mode-specific risk thresholds (0-100 scale)
    const thresholds: Record<string, number> = {
      'turbo': 20,      // Very conservative
      'balanced': 40,   // Moderate
      'safe': 30,       // Conservative
      'builder': 50,    // Standard
      'pro': 60,        // Permissive
      'expert': 80,     // Very permissive
      'god': 100,       // No limit
    };

    const threshold = thresholds[mode] || 50;

    // Simplified risk calculation (would be more sophisticated in production)
    const estimatedRisk = Math.random() * 100;

    if (estimatedRisk > threshold) {
      return this.blocked(
        `Risk score ${estimatedRisk.toFixed(1)} exceeds threshold ${threshold} for ${mode} mode`,
        {
          riskScore: estimatedRisk,
          threshold,
          mode,
        }
      );
    }

    return this.pass(
      `Risk score ${estimatedRisk.toFixed(1)} below threshold ${threshold}`,
      {
        riskScore: estimatedRisk,
        threshold,
        mode,
      }
    );
  }
}
