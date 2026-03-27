import chalk from "chalk";
import {
  loadLatestGovernanceTrace,
  loadLatestTimeline,
  saveMarkdownReport,
} from "../../../../packages/observability/src/trace-store";
import { renderGovernanceMarkdownReport } from "../../../../packages/observability/src/report-renderer";

export function handleReport(raw: string): void {
  const input = JSON.parse(raw) as { runId: string };
  const trace = loadLatestGovernanceTrace(input.runId);
  const timeline = loadLatestTimeline(input.runId);

  if (!trace || !timeline) {
    console.log(chalk.red(`Missing trace or timeline for runId=${input.runId}`));
    return;
  }

  const markdown = renderGovernanceMarkdownReport(trace, timeline);
  const file = saveMarkdownReport(input.runId, markdown);
  console.log(chalk.green(`Markdown report written: ${file}`));
}
