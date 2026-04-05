import { ScopeGate } from './gates/scope-gate.js';
import { ArchitectureGate } from './gates/architecture-gate.js';
import { SecurityGate } from './gates/security-gate.js';
import { CostGate } from './gates/cost-gate.js';
import { DeploymentGate } from './gates/deployment-gate.js';
import { QAGate } from './gates/qa-gate.js';
import { BuildGate } from './gates/build-gate.js';
import { LaunchGate } from './gates/launch-gate.js';
import { RiskThresholdGate } from './gates/risk-threshold-gate.js';
import { GateEvaluator, GateEvaluationContext, GateResult } from './gates/base-gate.js';
import { GateStore } from './gate-store.js';
import { logger } from '../../shared/src/logger.js';

export class GateManager {
  private gates: Map<string, GateEvaluator> = new Map();

  constructor() {
    // Register all 9 gates + existing gates
    this.registerGate(new ScopeGate());
    this.registerGate(new ArchitectureGate());
    this.registerGate(new SecurityGate());
    this.registerGate(new CostGate());
    this.registerGate(new DeploymentGate());
    this.registerGate(new QAGate());
    this.registerGate(new BuildGate());
    this.registerGate(new LaunchGate());
    this.registerGate(new RiskThresholdGate());
  }

  private registerGate(gate: GateEvaluator): void {
    this.gates.set(gate.name, gate);
    logger.debug({ gateName: gate.name }, 'Gate registered');
  }

  /**
   * Determine which gates should pause execution based on mode
   */
  private getGateSequence(mode: string): string[] {
    const allGates = Array.from(this.gates.keys());

    switch (mode) {
      case 'turbo':
        // Turbo: skip most gates, only run quick checks
        return ['Risk Threshold Gate'];

      case 'safe':
        // Safe: run all gates, pause on needs-review
        return allGates;

      case 'balanced':
        // Balanced: run all gates except optional ones
        return allGates.filter((g) => g !== 'Cost Gate');

      case 'builder':
      case 'pro':
        // Professional modes: all gates
        return allGates;

      case 'expert':
        // Expert: all gates, but launch gate is approval-only
        return allGates;

      case 'god':
        // God mode: skip all gates
        return [];

      default:
        return allGates;
    }
  }

  /**
   * Determine if a gate result should pause execution
   */
  shouldPauseForGate(result: GateResult, mode: string): boolean {
    if (result.severity === 'pass') return false;
    if (mode === 'god' || mode === 'turbo') return false;

    // Blocked gates always pause (require review)
    if (result.severity === 'blocked') return true;

    // Failed gates require review in safe mode
    if (result.severity === 'fail' && mode === 'safe') return true;

    // Warnings may require review in safe mode
    if (result.severity === 'warning' && mode === 'safe') return true;

    return false;
  }

  /**
   * Evaluate all gates for a run
   */
  async evaluateGates(context: GateEvaluationContext): Promise<GateResult[]> {
    const sequence = this.getGateSequence(context.mode);
    const results: GateResult[] = [];

    logger.info(
      { runId: context.run.runId, mode: context.mode, gateCount: sequence.length },
      'Starting gate evaluation'
    );

    for (const gateName of sequence) {
      const gate = this.gates.get(gateName);
      if (!gate) continue;

      try {
        const result = await gate.evaluate(context);
        results.push(result);

        // Record in database
        await GateStore.recordGateDecision(
          gateName,
          context.run.runId,
          result,
          result.passed ? 'pass' : result.severity === 'blocked' ? 'blocked' : 'needs-review'
        );

        logger.info(
          { gateName, result: result.severity, runId: context.run.runId },
          'Gate evaluated'
        );

        // Short-circuit on first block (in non-turbo, non-god modes)
        if (result.severity === 'blocked' && context.mode !== 'turbo' && context.mode !== 'god') {
          logger.info({ gateName, runId: context.run.runId }, 'Gate blocked execution');
          break;
        }
      } catch (err) {
        logger.error({ err, gateName, runId: context.run.runId }, 'Gate evaluation failed');
        results.push({
          gateName,
          passed: false,
          severity: 'fail',
          message: 'Gate evaluation error',
          details: { error: (err as any).message },
        });
      }
    }

    // Log summary
    const blocked = results.filter((r) => r.severity === 'blocked').length;
    const failed = results.filter((r) => r.severity === 'fail').length;
    const passed = results.filter((r) => r.severity === 'pass').length;

    logger.info(
      { runId: context.run.runId, passed, failed, blocked },
      'Gate evaluation completed'
    );

    return results;
  }

  /**
   * Check if any gates require pause/review
   */
  requiresReview(results: GateResult[], mode: string): boolean {
    return results.some((r) => this.shouldPauseForGate(r, mode));
  }

  /**
   * Check if any gates blocked execution
   */
  isBlocked(results: GateResult[]): boolean {
    return results.some((r) => r.severity === 'blocked');
  }

  /**
   * Manual approval override for gates
   */
  async overrideGateDecision(
    gateId: string,
    runId: string,
    reviewerId: string,
    approved: boolean
  ): Promise<void> {
    if (approved) {
      await GateStore.approveGate(gateId, reviewerId);
    } else {
      await GateStore.rejectGate(gateId, reviewerId, 'Manual rejection by reviewer');
    }

    logger.info(
      { gateId, runId, reviewerId, approved },
      'Gate decision overridden'
    );
  }
}

export const gateManager = new GateManager();
