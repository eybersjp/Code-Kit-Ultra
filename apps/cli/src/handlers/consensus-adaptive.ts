import { runAdaptiveConsensus } from "../../../../packages/governance/src";

export function handleAdaptiveConsensus(raw: string): string {
  try {
    const payload = JSON.parse(raw);
    const result = runAdaptiveConsensus(payload);
    return JSON.stringify(result, null, 2);
  } catch (e: any) {
    return `Error: Failed to process adaptive consensus - ${e.message}`;
  }
}
