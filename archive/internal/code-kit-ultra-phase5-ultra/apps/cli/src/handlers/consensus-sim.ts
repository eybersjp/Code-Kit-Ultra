import { runAdaptiveConsensus } from "../../../../packages/governance/src";

export function handleConsensusSim(raw: string): string {
  const payload = JSON.parse(raw);
  const result = runAdaptiveConsensus(payload);

  return [
    `RUN ${result.runId}`,
    `Decision: ${result.finalDecision}`,
    `Risk: ${result.riskLevel}`,
    `Threshold: ${result.threshold.toFixed(2)}`,
    `Approval: ${result.approvalScore.toFixed(2)}`,
    `Review: ${result.reviewScore.toFixed(2)}`,
    `Reject: ${result.rejectScore.toFixed(2)}`,
    `Pause: ${result.shouldPause}`,
    `Veto: ${result.vetoApplied ? `yes (${result.vetoBy})` : "no"}`,
    "Explanations:",
    ...result.explanations.map((x) =>
      `- ${x.agent}: ${x.decision} | weight=${x.effectiveWeight.toFixed(2)} | confidence=${x.confidence.toFixed(2)} | reliability=${x.reliability.toFixed(2)} | ${x.reason}`,
    ),
  ].join("\n");
}
