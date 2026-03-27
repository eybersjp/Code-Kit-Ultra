import { applyLearningCycle, loadLearningState, recordRunOutcome } from "../packages/learning/src/index";

const state = loadLearningState();

const outcome = recordRunOutcome({
  runId: "phase6-smoke-001",
  result: "success",
  issues: [],
  humanOverride: false,
  rollbackOccurred: false,
  postExecutionScore: 0.9,
  riskLevel: "medium",
  selectedSkills: ["skill_quote_engine", "skill_admin_dashboard_builder"],
  agentDecisions: [
    { agent: "planner", decision: "approve", confidence: 0.88 },
    { agent: "builder", decision: "approve", confidence: 0.83 },
    { agent: "reviewer", decision: "needs-review", confidence: 0.69 },
    { agent: "security", decision: "approve", confidence: 0.91 },
  ],
});

const result = applyLearningCycle({ state, outcome });

if (!result.summary.includes("Processed outcome")) {
  throw new Error("Learning cycle did not complete");
}

if (!Object.keys(result.updatedState.agentProfiles).length) {
  throw new Error("Agent profiles not updated");
}

console.log("Phase 6 smoke test passed");
