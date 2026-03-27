import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";

export function registerLearningReportCommand(program: Command): void {
  program.command("/ck-learning-report").action(() => {
    const file = path.resolve(".ck/learning/reports/latest-learning-report.md");
    if (!fs.existsSync(file)) {
      console.log(chalk.red("No learning report exists yet."));
      return;
    }
    console.log(chalk.cyan("\nLatest Learning Report\n"));
    console.log(fs.readFileSync(file, "utf-8"));
  });
}
