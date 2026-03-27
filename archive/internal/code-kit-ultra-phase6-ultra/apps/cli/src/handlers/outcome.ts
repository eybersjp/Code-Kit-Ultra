import chalk from "chalk";
import type { Command } from "commander";
import { applyLearningCycle, loadLearningState, recordRunOutcome } from "../../../../packages/learning/src/index";
import type { RunOutcomeInput } from "../../../../packages/shared/src/phase6-types";

export function registerOutcomeCommand(program: Command): void {
  program
    .command("/ck-outcome")
    .argument("<payload>", "JSON payload for execution outcome")
    .action((payload: string) => {
      const outcome = JSON.parse(payload) as RunOutcomeInput;
      const state = loadLearningState();
      recordRunOutcome(outcome);
      const learning = applyLearningCycle({ state, outcome });

      console.log(chalk.cyan("\nPhase 6 Outcome Recorded\n"));
      console.log(chalk.green("Run:"), outcome.runId);
      console.log(chalk.green("Result:"), outcome.result);
      console.log(chalk.green("Learning Summary:"), learning.summary);
    });
}
