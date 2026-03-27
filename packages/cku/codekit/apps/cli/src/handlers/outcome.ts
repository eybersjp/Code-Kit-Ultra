import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { applyLearningCycle, loadLearningState, recordRunOutcome } from "../../../../packages/learning/src/index";
import type { RunOutcomeInput } from "../../../../packages/shared/src/governance-types";

export function registerOutcomeCommand(program: Command): void {
  program
    .command("/ck-outcome")
    .description("Record the outcome of a run for self-tuning learning")
    .argument("<payload>", "JSON payload for execution outcome")
    .action((payload: string) => {
      try {
        const outcome = JSON.parse(payload) as RunOutcomeInput;
        const state = loadLearningState();
        recordRunOutcome(outcome);
        const learning = applyLearningCycle({ state, outcome });

        console.log(chalk.cyan("\nPhase 6 Outcome Recorded\n"));
        console.log(chalk.green("Run:"), outcome.runId);
        console.log(chalk.green("Result:"), outcome.result);
        console.log(chalk.green("Learning Summary:"), learning.summary);
      } catch (err: any) {
        console.error(chalk.red(`\nError: Failed to process outcome - ${err.message}`));
      }
    });

  program
    .command("/ck-outcome-file")
    .description("Record outcome from a JSON file")
    .argument("<filePath>", "Path to outcome JSON file")
    .action((filePath: string) => {
      try {
        const file = path.resolve(filePath);
        const payload = fs.readFileSync(file, "utf-8");
        const outcome = JSON.parse(payload) as RunOutcomeInput;
        const state = loadLearningState();
        recordRunOutcome(outcome);
        const learning = applyLearningCycle({ state, outcome });

        console.log(chalk.cyan("\nPhase 6 Outcome Recorded (from file)\n"));
        console.log(chalk.green("Run:"), outcome.runId);
        console.log(chalk.green("Result:"), outcome.result);
        console.log(chalk.green("Learning Summary:"), learning.summary);
      } catch (err: any) {
        console.error(chalk.red(`\nError: Failed to process outcome file - ${err.message}`));
      }
    });
}
