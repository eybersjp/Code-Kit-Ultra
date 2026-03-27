# Integration snippet

Example of swapping the old consensus engine inside the governed pipeline.

```ts
import { runAdaptiveConsensus } from "@code-kit/governance";

const adaptiveResult = runAdaptiveConsensus({
  runId,
  summary: batch.summary,
  riskLevel,
  votes: specialistVotes,
});

if (traceWriter) {
  traceWriter.append({
    type: "adaptive-consensus",
    payload: adaptiveResult,
  });
}

if (adaptiveResult.finalDecision === "reject") {
  return {
    status: "blocked",
    reason: adaptiveResult.summary,
  };
}

if (adaptiveResult.shouldPause) {
  return {
    status: "paused",
    reason: adaptiveResult.summary,
  };
}
```
