#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../../../packages/orchestrator/src/index";
import { saveRunReport } from "../../../packages/memory/src/run-store";
import { adapterHealthReport } from "../../../packages/adapters/src/router";
import { validateAllAdapterEnv } from "../../../packages/adapters/src/env";
import { reviewSkill, approveSkill, promoteSkill } from "../../../packages/skill-engine/src/promotion";
import { validateReviewerRole } from "../../../packages/governance/src/policy";
import { writeAudit } from "../../../packages/governance/src/audit";
import { rollbackSkill } from "../../../packages/governance/src/rollback";
import type { Mode, UserInput } from "../../../packages/shared/src/types";

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
    "## Assumptions",
    ...report.assumptions.map((a) => `- ${a.text}`),
    "",
    "## Clarifying Questions",
    ...(report.clarifyingQuestions.length ? report.clarifyingQuestions.map((q) => `- ${q.text}`) : ["- None"]),
    "",
    "## Skills",
    ...report.selectedSkills.map((s) => `- ${s.skillId} (${s.source})`),
    "",
    "## Routes",
    ...report.routes.map((r) => `- ${r.taskType}: ${r.adapterName} [${r.mode}]`),
    "",
    "## Gates",
    ...report.gates.map((g) => `- ${g.gate}: ${g.status} | pause=${g.shouldPause}`),
  ].join("\n");
  fs.writeFileSync(path.join(dir, "report.md"), md, "utf-8");
  fs.writeFileSync(path.join(dir, "gates.json"), JSON.stringify(report.gates, null, 2), "utf-8");
}

const program = new Command();
program.name("code-kit").description("Code Kit Ultra CLI").version("0.5.0");

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

    console.log(chalk.cyan("\nCode Kit Ultra — Phase 5 Run\n"));
    console.log(chalk.green("Summary:"), report.summary);
    console.log(chalk.yellow("\nRoutes:"));
    report.routes.forEach((r) => console.log(`- ${r.taskType}: ${r.adapterName} (${r.mode})`));
    console.log(chalk.yellow("\nSkills:"));
    report.selectedSkills.forEach((s) => console.log(`- ${s.skillId} (${s.source})${s.generatedPath ? ` -> ${s.generatedPath}` : ""}`));
    console.log(chalk.green(`\nArtifacts: ${dir}`));
    console.log(chalk.green(`JSON: ${reportPath}\n`));
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

program.command("review-skill")
  .argument("<skillId>")
  .requiredOption("--reviewer <role>")
  .requiredOption("--notes <notes>")
  .action((skillId, options) => {
    validateReviewerRole(options.reviewer);
    const manifest = reviewSkill(skillId, options.reviewer, options.notes);
    writeAudit({ action: "review", skillId, reviewer: options.reviewer });
    console.log(JSON.stringify(manifest, null, 2));
  });

program.command("approve-skill")
  .argument("<skillId>")
  .requiredOption("--reviewer <role>")
  .requiredOption("--notes <notes>")
  .action((skillId, options) => {
    validateReviewerRole(options.reviewer);
    const manifest = approveSkill(skillId, options.reviewer, options.notes);
    writeAudit({ action: "approve", skillId, reviewer: options.reviewer });
    console.log(JSON.stringify(manifest, null, 2));
  });

program.command("promote-skill")
  .argument("<skillId>")
  .requiredOption("--reviewer <role>")
  .action((skillId, options) => {
    validateReviewerRole(options.reviewer);
    const manifest = promoteSkill(skillId, options.reviewer);
    writeAudit({ action: "promote", skillId, reviewer: options.reviewer });
    console.log(JSON.stringify(manifest, null, 2));
  });

program.command("rollback-skill")
  .argument("<skillId>")
  .requiredOption("--reviewer <role>")
  .action((skillId, options) => {
    const manifest = rollbackSkill(skillId, options.reviewer);
    console.log(JSON.stringify(manifest, null, 2));
  });

program.parseAsync();