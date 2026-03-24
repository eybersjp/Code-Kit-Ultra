import chalk from "chalk";
import { loadLatestGovernanceTrace } from "../../../observability/src/trace-store";

export function handleTrace(raw: string): void {
  const input = JSON.parse(raw) as { runId: string };
  const trace = loadLatestGovernanceTrace(input.runId);

  if (!trace) {
    console.log(chalk.red(`No governance trace found for runId=${input.runId}`));
    return;
  }

  console.log(chalk.cyan(`\nRUN TRACE — ${trace.runId}\n`));
  console.log(`Decision: ${trace.finalDecision}`);
  console.log(`Reason: ${trace.finalReason}`);
  console.log("");

  console.log(`Intent: ${trace.intent.passed ? "PASS" : "FAIL"}`);
  console.log(`  ${trace.intent.reason}`);

  console.log(`Constraints: ${trace.constraints.passed ? "PASS" : "FAIL"}`);
  if (trace.constraints.violations.length) {
    trace.constraints.violations.forEach((v) => console.log(`  - ${v}`));
  }

  console.log(`Validation: ${trace.validation.passed ? "PASS" : "FAIL"}`);
  if (trace.validation.errors.length) {
    trace.validation.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log("Consensus:");
  trace.consensus.votes.forEach((vote) => {
    console.log(`  - ${vote.agent}: ${vote.decision} (${vote.weight}) → ${vote.reason}`);
  });

  console.log("");
  console.log(`Confidence Score: ${trace.confidence.score}`);
  console.log(`Threshold: ${trace.confidence.threshold}`);
  console.log("");
}
