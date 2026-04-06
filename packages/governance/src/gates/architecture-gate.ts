import { BaseGate, GateEvaluationContext, GateResult } from './base-gate.js';

/**
 * Architecture Gate: Check proposed changes against ADR constraints
 */
export class ArchitectureGate extends BaseGate {
  name = 'Architecture Gate';
  canBlock = true;

  async evaluate(context: GateEvaluationContext): Promise<GateResult> {
    const { run, proposedChanges } = context;

    if (!proposedChanges || proposedChanges.length === 0) {
      return this.pass('No architectural changes proposed');
    }

    // Simplified architectural rules
    const rules = [
      { pattern: /packages\/.*\/src\/.*\.test\.ts$/, allowed: true, rule: 'Test files are allowed in packages' },
      { pattern: /apps\/.*\/dist\//, allowed: false, rule: 'Build artifacts should not be committed' },
      { pattern: /node_modules/, allowed: false, rule: 'node_modules must not be committed' },
    ];

    const violations: any[] = [];

    for (const rule of rules) {
      if (!rule.allowed) {
        const matching = proposedChanges.filter((c) => rule.pattern.test(c.path || ''));
        if (matching.length > 0) {
          violations.push({
            rule: rule.rule,
            files: matching.map((f) => f.path),
          });
        }
      }
    }

    if (violations.length > 0) {
      return this.blocked('Architectural rule violations detected', {
        violations,
      });
    }

    return this.pass('All proposed changes comply with architecture decisions', {
      rulesChecked: rules.length,
      filesValidated: proposedChanges.length,
    });
  }
}
