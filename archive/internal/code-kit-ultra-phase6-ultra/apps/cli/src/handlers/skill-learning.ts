import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";

export function registerSkillLearningCommand(program: Command): void {
  program.command("/ck-skill-learning").action(() => {
    const file = path.resolve(".ck/learning/skills/skill-stats.json");
    if (!fs.existsSync(file)) {
      console.log(chalk.red("No skill learning data exists yet."));
      return;
    }
    console.log(chalk.cyan("\nSkill Learning\n"));
    console.log(fs.readFileSync(file, "utf-8"));
  });
}
