#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../../../packages/orchestrator/src/index";
import { saveRunReport } from "../../../packages/memory/src/run-store";
import { adapterHealthReport } from "../../../packages/adapters/src/router";
import { validateAllAdapterEnv } from "../../../packages/adapters/src/env";
import { executeTask } from "../../../packages/orchestrator/src/execute-task";
import type { Mode, TaskType, UserInput } from "../../../packages/shared/src/types";

function artifactDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(`artifacts/test-runs/${stamp}`);
}

function writeMarkdownReport(dir: string, report: Awaited<ReturnType<typeof runVerticalSlice>>) {
  const md = [
    "# Code Kit Ultra Run Report",
    "",
    `- Created: ${report.createdAt}`,
    `- Mode: ${report.input.mode}`,
    `- Summary: ${report.summary}`,
    "",
    "## Routes",
    ...report.routes.map((r) => `- ${r.taskType}: ${r.adapterName} [${r.mode}]`),
    "",
    "## Execution",
    ...((report.execution || []).map((e: any) => `- ${e.taskType}: ${e.adapter} ok=${e.ok} dryRun=${e.dryRun} classification=${e.classification}`)),
    "",
    "## Skills",
    ...report.selectedSkills.map((s) => `- ${s.skillId} (${s.source})`)
  ].join("\n");
  fs.writeFileSync(path.join(dir, "report.md"), md, "utf-8");
  fs.writeFileSync(path.join(dir, "gates.json"), JSON.stringify(report.gates, null, 2), "utf-8");
}

const program = new Command();
program.name("code-kit").description("Code Kit Ultra CLI").version("0.6.0");

program.command("init")
  .argument("<idea>", "Project idea")
  .option("-m, --mode <mode>", "safe | balanced | god", "balanced")
  .option("--dry-run", "Run safely without external execution", false)
  .action(async (idea, options) => {
    const input: UserInput = { idea, mode: options.mode as Mode, dryRun: Boolean(options.dryRun), deliverable: "app", priority: "quality", skillLevel: "intermediate" };
    const report = await runVerticalSlice(input);
    const dir = artifactDir();
    fs.mkdirSync(dir, { recursive: true });
    const reportPath = saveRunReport(report, dir);
    writeMarkdownReport(dir, report);
    fs.writeFileSync(path.join(dir, "console.log"), report.summary + "\n", "utf-8");

    console.log(chalk.cyan("\nCode Kit Ultra — Phase 6 Antigravity\n"));
    console.log(chalk.green("Summary:"), report.summary);
    report.routes.forEach((r) => console.log(`- route ${r.taskType}: ${r.adapterName} (${r.mode})`));
    (report.execution || []).forEach((e: any) => console.log(`- exec ${e.taskType}: ${e.adapter} ok=${e.ok} dryRun=${e.dryRun}`));
    console.log(chalk.green(`\nArtifacts: ${dir}`));
    console.log(chalk.green(`JSON: ${reportPath}\n`));
  });

program.command("execute")
  .argument("<taskType>")
  .requiredOption("--payload <json>")
  .option("--dry-run", "Execute as dry-run", false)
  .action(async (taskType, options) => {
    const payload = JSON.parse(options.payload);
    const result = await executeTask(taskType as TaskType, payload, Boolean(options.dryRun));
    console.log(JSON.stringify(result, null, 2));
  });

program.command("adapters").action(async () => {
  const report = await adapterHealthReport();
  console.log(chalk.cyan("\nAdapter Health\n"));
  report.forEach((r) => console.log(`- ${r.name}: ok=${r.ok} | ${r.details}`));
});

program.command("validate-env").action(() => {
  const report = validateAllAdapterEnv();
  console.log(chalk.cyan("\nAdapter Env Validation\n"));
  report.forEach((r) => console.log(`- ${r.name}: ok=${r.ok} ${r.missing.length ? `| missing=${r.missing.join(", ")}` : ""}`));
});

program.parseAsync();