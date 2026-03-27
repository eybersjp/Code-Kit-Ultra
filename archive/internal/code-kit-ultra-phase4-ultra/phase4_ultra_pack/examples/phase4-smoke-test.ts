import {
  buildGovernanceTrace,
  renderScoreExplanation,
  TimelineBuilder,
} from "../packages/observability/src/index";

const runId = "smoke-phase4";
const trace = buildGovernanceTrace({
  runId,
  summary: "Smoke test",
  mode: "balanced",
  intent: {
    passed: true,
    score: 0.9,
    reason: "Intent matches request.",
  },
  constraints: {
    passed: true,
    violations: [],
  },
  validation: {
    passed: true,
    errors: [],
  },
  consensus: {
    passed: true,
    approvalWeight: 2.0,
    rejectionWeight: 0.2,
    threshold: 1.2,
    reason: "Consensus threshold exceeded.",
    votes: [
      { agent: "Planner", decision: "approve", weight: 0.7, reason: "Looks good." },
      { agent: "Builder", decision: "approve", weight: 0.7, reason: "Executable." },
      { agent: "Reviewer", decision: "approve", weight: 0.6, reason: "Validated." },
    ],
  },
});

const timeline = new TimelineBuilder(runId)
  .add("governance", "start", "Started governance checks")
  .add("governance", "end", "Finished governance checks")
  .build();

if (trace.finalDecision !== "execute") {
  throw new Error("Expected execute decision");
}

if (timeline.length !== 2) {
  throw new Error("Expected two timeline events");
}

const explanation = renderScoreExplanation(trace);
if (!explanation.includes("Confidence:")) {
  throw new Error("Score explanation missing");
}

console.log("Phase 4 smoke test passed");
