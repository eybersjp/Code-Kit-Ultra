#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runVerticalSlice } from "../../../packages/orchestrator/src/index";
import { buildMarkdownReport } from "../../../packages/orchestrator/src/report-builder";
import { saveRunReport } from "../../../packages/memory/src/run-store";
import type { Deliverable, Mode, Priority, UserInput } from "../../../packages/shared/src/types";

const program = new Command();

program.name("code-kit").description("Code Kit Ultra CLI").version("0.7.0-mvp");

program
  .command("init")
  .argument("<idea>", "Project idea")
  .option("-m, --mode <mode>", "safe | balanced | god", "balanced")
  .option("-s, --skill-level <level>", "beginner | intermediate | advanced", "intermediate")
  .option("-p, --priority <priority>", "speed | quality | low-cost | best-ux | scalability | business-ready", "quality")
  .option("-d, --deliverable <deliverable>", "app | automation | website | mvp | internal-tool | agent-system | docs | business-package", "app")
  .action(async (idea, options) => {
    const input: UserInput = {
      idea,
      mode: options.mode as Mode,
      skillLevel: options.skillLevel,
      priority: options.priority as Priority,
      deliverable: options.deliverable as Deliverable,
    };

    const report = await runVerticalSlice(input);
    const markdown = buildMarkdownReport(report);
    const paths = saveRunReport(report, markdown);

    console.log(chalk.cyan("\nCode Kit Ultra — Phase 7 MVP Report\n"));
    console.log(chalk.green("Summary:"), report.summary);

    console.log(chalk.yellow("\nAssumptions:"));
    report.assumptions.forEach((a) => console.log(`- ${a.text} [${a.confidence}]`));

    console.log(chalk.yellow("\nClarifying Questions:"));
    if (report.clarifyingQuestions.length === 0) console.log("- None");
    report.clarifyingQuestions.forEach((q) => console.log(`- ${q.text} | blocking=${q.blocking}`));

    console.log(chalk.yellow("\nPlan:"));
    report.plan.forEach((p) => console.log(`- [${p.phase}] ${p.title}`));

    console.log(chalk.yellow("\nSelected Skills:"));
    report.selectedSkills.forEach((s) => console.log(`- ${s.skillId} (${s.source})`));

    console.log(chalk.yellow("\nGates:"));
    report.gates.forEach((g) => console.log(`- ${g.gate}: ${g.status} | pause=${g.shouldPause} | ${g.reason}`));

    console.log(chalk.yellow("\nAdapter Executions:"));
    report.adapterExecutions.forEach((e) => console.log(`- ${e.taskId}: ${e.adapter} -> ${e.status}`));

    console.log(chalk.green(`\nSaved JSON artifact: ${paths.jsonPath}`));
    console.log(chalk.green(`Saved markdown artifact: ${paths.markdownPath}`));
    console.log(chalk.magenta(`Pause required: ${report.shouldPause}\n`));
  });

program.parse();
