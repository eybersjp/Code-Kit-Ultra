import type { RunState } from '../../../shared/src/types.js';

export interface GateEvaluationContext {
  run: RunState;
  mode: string;
  proposedChanges?: any[];
  estimatedCost?: number;
  testCoverageDelta?: number;
  buildOutput?: any;
  deploymentTarget?: string;
}

export interface GateResult {
  gateName: string;
  passed: boolean;
  severity: 'pass' | 'fail' | 'warning' | 'blocked';
  message: string;
  details?: Record<string, any>;
  requiresReview?: boolean;
}

export interface GateEvaluator {
  name: string;
  canBlock: boolean;
  evaluate(context: GateEvaluationContext): Promise<GateResult>;
}

export abstract class BaseGate implements GateEvaluator {
  abstract name: string;
  abstract canBlock: boolean;

  abstract evaluate(context: GateEvaluationContext): Promise<GateResult>;

  protected pass(message: string, details?: Record<string, any>): GateResult {
    return {
      gateName: this.name,
      passed: true,
      severity: 'pass',
      message,
      details,
    };
  }

  protected fail(message: string, details?: Record<string, any>, requiresReview = false): GateResult {
    return {
      gateName: this.name,
      passed: false,
      severity: 'fail',
      message,
      details,
      requiresReview,
    };
  }

  protected blocked(message: string, details?: Record<string, any>): GateResult {
    return {
      gateName: this.name,
      passed: false,
      severity: 'blocked',
      message,
      details,
    };
  }

  protected warning(message: string, details?: Record<string, any>): GateResult {
    return {
      gateName: this.name,
      passed: true,
      severity: 'warning',
      message,
      details,
    };
  }
}
