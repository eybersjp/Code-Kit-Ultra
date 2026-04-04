import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Deployment Gate: Verify deployment target is approved for this run mode
 */
export class DeploymentGate extends BaseGate {
  name = 'Deployment Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { run, mode, deploymentTarget } = context;

    // Mode-specific deployment rules
    const allowedTargets: Record<string, string[]> = {
      'turbo': ['staging'],
      'balanced': ['staging', 'canary'],
      'safe': ['staging'],
      'expert': ['staging', 'canary', 'production'],
      'god': ['staging', 'canary', 'production'],
    };

    const targets = allowedTargets[mode] || [];

    if (!deploymentTarget) {
      return this.warning('No deployment target specified');
    }

    if (!targets.includes(deploymentTarget)) {
      return this.blocked(
        `Deployment to ${deploymentTarget} not allowed in ${mode} mode`,
        {
          deploymentTarget,
          mode,
          allowedTargets: targets,
        }
      );
    }

    return this.pass(`Deployment to ${deploymentTarget} approved for ${mode} mode`, {
      deploymentTarget,
      mode,
    });
  }
}
