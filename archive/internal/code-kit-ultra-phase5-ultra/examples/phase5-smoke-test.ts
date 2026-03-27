import { runAdaptiveConsensus } from "../packages/governance/src";

const result = runAdaptiveConsensus({
  runId: "smoke-001",
  summary: "Test risky mutation path",
  riskLevel: "medium",
  votes: [
    { agent: "planner", decision: "approve", confidence: 0.88, reason: "Plan is coherent" },
    { agent: "builder", decision: "approve", confidence: 0.80, reason: "Feasible implementation" },
    { agent: "reviewer", decision: "needs-review", confidence: 0.71, reason: "Missing tests" },
    { agent: "security", decision: "approve", confidence: 0.90, reason: "No obvious policy risk" },
  ],
});

if (!result.finalDecision) throw new Error("No final decision");
if (!result.explanations.length) throw new Error("No explanations generated");

console.log("Phase 5 smoke test passed");
console.log(result.summary);
