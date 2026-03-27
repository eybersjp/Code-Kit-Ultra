import chalk from "chalk";
import { loadLatestTimeline } from "../../../../packages/observability/src/trace-store";

export function handleTimeline(raw: string): void {
  const input = JSON.parse(raw) as { runId: string };
  const events = loadLatestTimeline(input.runId);

  if (!events) {
    console.log(chalk.red(`No timeline found for runId=${input.runId}`));
    return;
  }

  console.log(chalk.cyan(`\nTIMELINE — ${input.runId}\n`));
  for (const event of events) {
    console.log(`[${event.at}] [${event.phase}] ${event.event} — ${event.detail}`);
  }
  console.log("");
}
