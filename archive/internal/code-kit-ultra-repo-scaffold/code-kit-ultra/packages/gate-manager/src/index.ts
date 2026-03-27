import { GateName, GateResult } from '../../types/src';

export function evaluateGate(gate: GateName, risks: string[] = []): GateResult {
  return {
    gate,
    status: risks.length ? 'needs_review' : 'pass',
    risks,
    recommendation: risks.length ? 'ask_user' : 'continue'
  };
}
