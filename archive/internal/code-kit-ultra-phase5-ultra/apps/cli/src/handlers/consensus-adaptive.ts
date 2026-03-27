import { runAdaptiveConsensus } from "../../../../packages/governance/src";

export function handleAdaptiveConsensus(raw: string): string {
  const payload = JSON.parse(raw);
  const result = runAdaptiveConsensus(payload);
  return JSON.stringify(result, null, 2);
}
