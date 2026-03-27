import { Command } from "commander";
import { attemptHealing } from "../../../packages/healing/src/healing-engine";
import { loadHealingAttempts, loadHealingStats } from "../../../packages/healing/src/healing-store";

export function registerPhase10_5Commands(program: Command): void {
  program
    .command("heal-step")
    .requiredOption("--run <id>", "Run ID")
    .requiredOption("--step <id>", "Step ID")
    .requiredOption("--adapter <id>", "Adapter ID")
    .requiredOption("--error <message>", "Error message")
    .option("--path <value>", "Optional file path payload")
    .action(async (options: any) => {
      const attempt = await attemptHealing({
        runId: String(options.run),
        stepId: String(options.step),
        adapterId: String(options.adapter),
        failureType: "unknown-failure",
        errorMessage: String(options.error),
        payload: options.path ? { path: String(options.path) } : undefined,
      });

      console.log(JSON.stringify(attempt, null, 2));
    });

  program
    .command("healing-report")
    .requiredOption("--run <id>", "Run ID")
    .action((options: any) => {
      console.log(JSON.stringify(loadHealingAttempts(String(options.run)), null, 2));
    });

  program
    .command("healing-stats")
    .action(() => {
      console.log(JSON.stringify(loadHealingStats(), null, 2));
    });
}
