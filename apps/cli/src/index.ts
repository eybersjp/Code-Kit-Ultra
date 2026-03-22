#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { loadProjectMemory } from "../../../packages/memory/src";
import { runVerticalSlice } from "../../../packages/orchestrator/src";
import type { GateDecision, Mode, SelectedSkill, Task } from "../../../packages/shared/src";

function normalizeMode(input: string | undefined): Mode {
  if (input === "safe" || input === "god" || input === "balanced") {
    return input;
  }
  return "balanced";
}

function printSection(title: string): void {
  console.log(chalk.yellow(`\n${title}`));
}

function printPlan(plan: Task[]): void {
  printSection("Plan:");
  if (!plan.length) {
    console.log("- None");
    return;
  }

  for (const task of plan) {
    const dependencySuffix = task.dependencies.length
      ? ` [deps: ${task.dependencies.join(", ")}]`
      : "";
    console.log(`- ${task.id}: ${task.title}${dependencySuffix}`);
  }
}

function printSkills(skills: SelectedSkill[]): void {
  printSection("Selected Skills:");
  if (!skills.length) {
    console.log("- None");
    return;
  }

  for (const skill of skills) {
    const reason = typeof skill.reason === "string" ? ` — ${skill.reason}` : "";
    const score = typeof skill.score === "number" ? ` (score=${skill.score})` : "";
    console.log(`- ${skill.skillId ?? skill.name}${score}${reason}`);
  }
}

function printGates(gates: GateDecision[]): void {
  printSection("Gates:");
  if (!gates.length) {
    console.log("- None");
    return;
  }

  for (const gate of gates) {
    const action = gate.recommendedAction ? ` | action: ${gate.recommendedAction}` : "";
    console.log(`- ${gate.gate}: ${gate.status} | ${gate.reason}${action}`);
  }
}

const program = new Command();

program
  .name("code-kit")
  .description("Code Kit Ultra CLI")
  .version("1.0.3");

program
  .command("init")
  .argument("<idea>", "Project idea")
  .option("-m, --mode <mode>", "safe | balanced | god", "balanced")
  .option("--dry-run", "mark the run as a dry run", false)
  .action((idea: string, options: { mode?: string; dryRun?: boolean }) => {
    const trimmedIdea = idea.trim();

    if (!trimmedIdea) {
      console.error(chalk.red("Error: idea must not be empty."));
      process.exitCode = 1;
      return;
    }

    const result = runVerticalSlice({
      idea: trimmedIdea,
      mode: normalizeMode(options.mode),
      dryRun: Boolean(options.dryRun),
    });

    console.log(chalk.cyan("\nCode Kit Ultra — Vertical Slice Report\n"));
    console.log(chalk.green("Summary:"), result.report.summary);
    console.log(chalk.green("Overall gate status:"), result.overallGateStatus);
    console.log(chalk.green("Artifact directory:"), result.artifactDirectory);
    console.log(chalk.green("Artifact report path:"), result.artifactReportPath);
    console.log(chalk.green("Memory path:"), result.memoryPath);

    printSection("Assumptions:");
    if (!result.report.assumptions.length) {
      console.log("- None");
    } else {
      for (const assumption of result.report.assumptions) {
        console.log(`- ${assumption.text}`);
      }
    }

    printSection("Clarifying Questions:");
    if (!result.report.clarifyingQuestions.length) {
      console.log("- None");
    } else {
      for (const question of result.report.clarifyingQuestions) {
        const prefix = question.blocking ? "[blocking] " : "";
        console.log(`- ${prefix}${question.text}`);
      }
    }

    printPlan(result.report.plan);
    printSkills(result.report.selectedSkills);
    printGates(result.report.gates);

    console.log("");
  });

program.command("validate-env").action(() => {
  const memory = loadProjectMemory();
  console.log(
    JSON.stringify(
      {
        status: "ok",
        lastRunAt: memory.lastRunAt,
        lastIdea: memory.lastIdea,
        totalStoredRuns: memory.runs.length,
      },
      null,
      2,
    ),
  );
});

program.command("metrics").action(() => {
  const memory = loadProjectMemory();
  const runsByMode: Record<string, number> = {};

  for (const run of memory.runs) {
    const key = run.mode ?? "unknown";
    runsByMode[key] = (runsByMode[key] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        totalRuns: memory.runs.length,
        uniqueIdeas: new Set(memory.recentIdeas).size,
        lastRunAt: memory.lastRunAt,
        lastIdea: memory.lastIdea,
        runsByMode,
      },
      null,
      2,
    ),
  );
});

program.parse();