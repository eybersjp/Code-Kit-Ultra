import chalk from "chalk";
import { loadLatestGovernanceTrace } from "../../../observability/src/trace-store";
import { renderScoreExplanation } from "../../../observability/src/score-explain";

export function handleScoreExplain(raw: string): void {
  const input = JSON.parse(raw) as { runId: string };
  const trace = loadLatestGovernanceTrace(input.runId);

  if (!trace) {
    console.log(chalk.red(`No governance trace found for runId=${input.runId}`));
    return;
  }

  console.log(chalk.cyan(`\nSCORE EXPLANATION — ${trace.runId}\n`));
  console.log(renderScoreExplanation(trace));
  console.log("");
}
