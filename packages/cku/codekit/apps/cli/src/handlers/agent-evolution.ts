import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";

export function registerAgentEvolutionCommand(program: Command): void {
  program
    .command("/ck-agent-evolution")
    .description("Track the reliability evolution of a specialist agent")
    .argument("<agent>")
    .action((agent: string) => {
      const file = path.resolve(`.ck/learning/agents/${agent}.json`);
      if (!fs.existsSync(file)) {
        console.log(chalk.red(`No profile found for agent: ${agent}`));
        return;
      }
      console.log(chalk.cyan(`\nAgent Evolution: ${agent}\n`));
      const profile = JSON.parse(fs.readFileSync(file, "utf-8"));
      console.log(JSON.stringify(profile, null, 2));
    });
}
