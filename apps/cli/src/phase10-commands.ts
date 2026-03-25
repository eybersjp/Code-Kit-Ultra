import { Command } from "commander";
import { buildLearningReport } from "../../../packages/learning/src/learning-engine";
import { recordRunOutcome } from "../../../packages/orchestrator/src/outcome-engine";

export function registerPhase10Commands(program: Command): void {
  program
    .command("outcome")
    .requiredOption("--run <id>", "Run ID")
    .requiredOption("--success <value>", "true | false")
    .requiredOption("--retries <count>", "Retry count")
    .requiredOption("--time-ms <value>", "Execution time in ms")
    .requiredOption("--quality <value>", "Quality score 0..1")
    .option("--adapters <value>", "Comma-separated adapter list", "terminal")
    .option("--failure <value>", "Dominant failure type")
    .option("--rating <value>", "User rating 1..5")
    .option("--feedback <value>", "User feedback")
    .action((options: any) => {
      const outcome = recordRunOutcome({
        runId: String(options.run),
        success: String(options.success) === "true",
        retryCount: Number(options.retries),
        timeTakenMs: Number(options["timeMs"] ?? options["time-ms"]),
        qualityScore: Number(options.quality),
        adaptersUsed: String(options.adapters).split(",").map((x: string) => x.trim()).filter(Boolean),
        dominantFailureType: options.failure ? String(options.failure) : undefined,
        userRating: options.rating ? Number(options.rating) : undefined,
        userFeedback: options.feedback ? String(options.feedback) : undefined,
      });

      console.log(JSON.stringify(outcome, null, 2));
    });

  program
    .command("learning-report")
    .action(() => {
      console.log(JSON.stringify(buildLearningReport(), null, 2));
    });
}
