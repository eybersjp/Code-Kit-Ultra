import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { runAdaptiveConsensus } from "../../../../packages/governance/src";

export function handleConsensusSim(raw: string): string {
  try {
    const payload = JSON.parse(raw);
    const result = runAdaptiveConsensus(payload);

    return [
      `RUN ${result.runId}`,
      `Decision: ${result.finalDecision}`,
      `Risk: ${result.riskLevel}`,
      `Threshold: ${result.threshold.toFixed(2)}`,
      `Approval: ${result.approvalScore.toFixed(2)}`,
      `Review: ${result.reviewScore.toFixed(2)}`,
      `Reject: ${result.rejectScore.toFixed(2)}`,
      `Pause: ${result.shouldPause}`,
      `Veto: ${result.vetoApplied ? `yes (${result.vetoBy})` : "no"}`,
      "Explanations:",
      ...result.explanations.map((x) =>
        `- ${x.agent}: ${x.decision} | weight=${x.effectiveWeight.toFixed(2)} | confidence=${x.confidence.toFixed(2)} | reliability=${x.reliability.toFixed(2)} | ${x.reason}`,
      ),
    ].join("\n");
  } catch (e: any) {
    return `Error: Failed to process consensus simulation - ${e.message}`;
  }
}

export function registerConsensusSimFileCommand(program: Command): void {
  program
    .command("/ck-consensus-sim-file")
    .description("Simulate adaptive consensus from a JSON file")
    .argument("<filePath>", "Path to consensus simulation JSON")
    .action((filePath: string) => {
      try {
        const file = path.resolve(filePath);
        const raw = fs.readFileSync(file, "utf-8");
        process.stdout.write(`\nConsensus Simulation (from file)\n\n`);
        process.stdout.write(handleConsensusSim(raw) + "\n");
      } catch (err: any) {
        console.error(chalk.red(`\nError: Failed to process consensus file - ${err.message}`));
      }
    });
}
