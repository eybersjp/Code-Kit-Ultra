import {
  buildGovernanceTrace,
  renderGovernanceMarkdownReport,
  saveGovernanceTrace,
  saveMarkdownReport,
  saveTimeline,
  TimelineBuilder,
} from "../packages/observability/src/index";

// Example only. Replace the mocked values below with the actual outputs from
// your current intent engine, constraint engine, validation engine, consensus engine,
// and confidence scorer inside the real orchestrator.

const runId = "phase4-demo-001";
const timeline = new TimelineBuilder(runId)
  .add("intake", "parsed_input", "Accepted run payload and started governance")
  .add("governance", "intent_checked", "Intent engine returned alignment pass")
  .add("governance", "constraints_checked", "Constraint engine found no blocking violations")
  .add("governance", "validation_checked", "Validation engine accepted batch structure")
  .add("governance", "consensus_checked", "Consensus engine approved execution")
  .add("governance", "decision_finalized", "Governance decision set to execute")
  .build();

const trace = buildGovernanceTrace({
  runId,
  summary: "Demo batch for observability layer",
  mode: "balanced",
  intent: {
    passed: true,
    score: 0.93,
    reason: "Action batch aligns with the original request and allowed scope.",
    matchedSignals: ["README update", "docs path"],
  },
  constraints: {
    passed: true,
    violations: [],
    warnings: [],
    appliedPolicies: ["allowedPaths", "blockedCommandPatterns"],
  },
  validation: {
    passed: true,
    errors: [],
    warnings: [],
  },
  consensus: {
    passed: true,
    approvalWeight: 2.3,
    rejectionWeight: 0.4,
    threshold: 1.5,
    reason: "Weighted approval exceeded the configured threshold.",
    votes: [
      { agent: "Planner", decision: "approve", weight: 0.8, reason: "Plan is coherent." },
      { agent: "Builder", decision: "approve", weight: 0.8, reason: "Execution is feasible." },
      { agent: "Reviewer", decision: "approve", weight: 0.7, reason: "Risk is acceptable." },
      { agent: "Security", decision: "abstain", weight: 0.4, reason: "No shell mutation in this batch." },
    ],
  },
  confidenceThreshold: 0.7,
});

const traceFile = saveGovernanceTrace(trace);
const timelineFile = saveTimeline(runId, timeline);
const markdown = renderGovernanceMarkdownReport(trace, timeline);
const reportFile = saveMarkdownReport(runId, markdown);

console.log({ traceFile, timelineFile, reportFile });
