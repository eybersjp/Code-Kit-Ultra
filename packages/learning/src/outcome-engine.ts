import { persistOutcome } from "./storage";
import { appendMemoryGraphEvent } from "../../observability/src/memory-graph";
import type { RunOutcomeInput } from "../../shared/src/governance-types";

export function recordRunOutcome(outcome: RunOutcomeInput): RunOutcomeInput {
  persistOutcome(outcome);
  appendMemoryGraphEvent({
    timestamp: new Date().toISOString(),
    runId: outcome.runId,
    type: "outcome_recorded",
    data: {
      result: outcome.result,
      postExecutionScore: outcome.postExecutionScore,
      rollbackOccurred: outcome.rollbackOccurred,
      humanOverride: outcome.humanOverride,
      riskLevel: outcome.riskLevel,
    },
  });
  return outcome;
}
