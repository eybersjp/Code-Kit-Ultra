#!/usr/bin/env node
import { runVerticalSlice } from "../../../packages/orchestrator/src/index";
import { saveConsoleOutput } from "../../../packages/memory/src/run-store";
import type { Mode, RunOptions, UserInput } from "../../../packages/shared/src/types";

function getArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index >= 0) {
    return process.argv[index + 1];
  }
  return fallback;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseInput(): { input: UserInput; options: RunOptions } {
  const [, , command, ...rest] = process.argv;
  if (command !== "init") {
    throw new Error('Usage: npm run ck -- init "<idea>" [--mode balanced] [--dry-run] [--output-dir artifacts/test-runs/custom]');
  }

  const idea = rest.find((value: string) => !value.startsWith("--"));
  if (!idea) {
    throw new Error("Missing project idea.");
  }

  const input: UserInput = {
    idea,
    mode: (getArg("--mode", "balanced") as Mode) || "balanced",
    skillLevel: getArg("--skill-level", "intermediate") as UserInput["skillLevel"],
    priority: getArg("--priority", "quality") as UserInput["priority"],
    deliverable: getArg("--deliverable", "app") as UserInput["deliverable"]
  };

  const options: RunOptions = {
    dryRun: hasFlag("--dry-run"),
    outputDir: getArg("--output-dir")
  };

  return { input, options };
}

async function main(): Promise<void> {
  const { input, options } = parseInput();
  const report = await runVerticalSlice(input, options);

  const lines = [
    "",
    "Code Kit Ultra — Vertical Slice Report",
    "",
    `Summary: ${report.summary}`,
    "",
    "Assumptions:",
    ...(report.assumptions.length ? report.assumptions.map((a) => `- ${a.text}`) : ["- None"]),
    "",
    "Clarifying Questions:",
    ...(report.clarifyingQuestions.length
      ? report.clarifyingQuestions.map((q) => `- ${q.text}`)
      : ["- None"]),
    "",
    "Plan:",
    ...report.plan.map((p) => `- [${p.phase}] ${p.title}`),
    "",
    "Selected Skills:",
    ...report.selectedSkills.map((s) => `- ${s.skillId} (${s.source})`),
    "",
    "Gates:",
    ...report.gates.map((g) => `- ${g.gate}: ${g.status} | pause=${g.shouldPause} | ${g.reason}`),
    "",
    "Adapter Executions:",
    ...report.adapterExecutions.map((a) => `- ${a.taskId}: ${a.adapter} -> ${a.resultSummary}`),
    "",
    `Saved JSON report: ${report.paths?.jsonReportPath}`,
    `Saved Markdown report: ${report.paths?.markdownReportPath}`,
    `Saved Gate snapshot: ${report.paths?.gateSnapshotPath}`,
    `Memory file: ${report.paths?.memoryPath}`,
    ""
  ];

  for (const line of lines) console.log(line);
  if (report.paths) {
    saveConsoleOutput(lines, report.paths);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
