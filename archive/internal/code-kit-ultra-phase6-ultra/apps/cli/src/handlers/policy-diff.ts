import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";

export function registerPolicyDiffCommand(program: Command): void {
  program.command("/ck-policy-diff").action(() => {
    const file = path.resolve(".ck/learning/policies/policy-diff.json");
    if (!fs.existsSync(file)) {
      console.log(chalk.red("No policy diff exists yet."));
      return;
    }
    console.log(chalk.cyan("\nLatest Policy Diff\n"));
    console.log(fs.readFileSync(file, "utf-8"));
  });
}
