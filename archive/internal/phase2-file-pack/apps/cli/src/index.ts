#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { recordRun, loadProjectMemory, getArtifactsRootForDebug, getProjectMemoryPathForDebug } from "../../../../packages/memory/src";
import type { Mode, RunReport } from "../../../../packages/shared/src";

interface InitCommandOptions {
  mode?: string;
  dryRun?: boolean;
}

interface ValidatedInitInput {
  idea: string;
  mode: Mode;
  dryRun: boolean;
}

const program = new Command();

program
  .name("code-kit")
  .description("Code Kit Ultra CLI")
  .version("1.0.0");

program
  .command("validate-env")
  .description("Ensure local Code Kit directories and memory files are ready")
  .action(() => {
    loadProjectMemory();

    console.log(chalk.green("Environment validation passed."));
    console.log(`${chalk.cyan("Artifacts root:")} ${getArtifactsRootForDebug()}`);
    console.log(`${chalk.cyan("Project memory:")} ${getProjectMemoryPathForDebug()}`);
  });

program
  .command("metrics")
  .description("Print basic local run metrics from project memory")
  .action(() => {
    const memory = loadProjectMemory();
    const totalRuns = memory.runs.length;
    const uniqueIdeas = memory.recentIdeas.length;

    const runsByMode = memory.runs.reduce<Record<string, number>>((accumulator, run) => {
      const key = run.mode ?? "unknown";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const payload = {
      totalRuns,
      uniqueIdeas,
      lastRunAt: memory.lastRunAt,
      lastIdea: memory.lastIdea,
      runsByMode,
      recentArtifactDirectories: memory.recentArtifactDirectories,
    };

    console.log(JSON.stringify(payload, null, 2));
  });

program
  .command("init")
  .description("Bootstrap a typed Code Kit run and persist it locally")
  .argument("<idea>", "The idea or project objective to initialize")
  .option("--mode <mode>", "Execution mode: safe, balanced, or god", "balanced")
  .option("--dry-run", "Create the run artifact without implying live execution", false)
  .action((idea: string, options: InitCommandOptions) => {
    try {
      const input = validateInitInput(idea, options);
      const report = createBootstrapRunReport(input);
      const result = recordRun(report);

      console.log(chalk.green("Code Kit run recorded successfully."));
      console.log(`${chalk.cyan("Idea:")} ${input.idea}`);
      console.log(`${chalk.cyan("Mode:")} ${input.mode}`);
      console.log(`${chalk.cyan("Dry run:")} ${String(input.dryRun)}`);
      console.log(`${chalk.cyan("Summary:")} ${extractSummary(report)}`);
      console.log(`${chalk.cyan("Artifact directory:")} ${result.artifactDirectory}`);
      console.log(`${chalk.cyan("Run report:")} ${result.artifactReportPath}`);
      console.log(`${chalk.cyan("Project memory:")} ${result.memoryPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown CLI error";
      console.error(chalk.red(`Code Kit CLI error: ${message}`));
      process.exitCode = 1;
    }
  });

program.parse(process.argv);

function validateInitInput(idea: string, options: InitCommandOptions): ValidatedInitInput {
  const normalizedIdea = idea.trim();

  if (!normalizedIdea) {
    throw new Error("An idea is required. Example: code-kit init \"Build an AI quoting assistant\"");
  }

  const normalizedMode = normalizeMode(options.mode);
  const dryRun = Boolean(options.dryRun);

  return {
    idea: normalizedIdea,
    mode: normalizedMode,
    dryRun,
  };
}

function normalizeMode(value: string | undefined): Mode {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue || normalizedValue === "balanced") {
    return "balanced";
  }

  if (normalizedValue === "safe" || normalizedValue === "god") {
    return normalizedValue;
  }

  throw new Error(`Invalid mode \"${value}\". Supported values are: safe, balanced, god.`);
}

function createBootstrapRunReport(input: ValidatedInitInput): RunReport {
  const createdAt = new Date().toISOString();

  const bootstrapReport = {
    input: {
      idea: input.idea,
      mode: input.mode,
      dryRun: input.dryRun,
    },
    assumptions: [
      "This is a Phase 3 CLI bootstrap run.",
      "No orchestrator, planner, or gate engine is active yet.",
      "The report exists to validate typed CLI-to-persistence wiring.",
    ],
    clarifyingQuestions: [],
    plan: [],
    selectedSkills: [],
    gates: [],
    summary: `Bootstrap run created for: ${input.idea}`,
    createdAt,
  };

  return bootstrapReport as unknown as RunReport;
}

function extractSummary(report: RunReport): string {
  const candidate = (report as Record<string, unknown>).summary;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : "No summary available.";
}
