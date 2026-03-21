#!/usr/bin/env node
import { runVerticalSlice } from "../../../packages/orchestrator/src/index";
import { saveConsoleOutput, markPromotedSkill } from "../../../packages/memory/src/run-store";
import { checkAllAdapters } from "../../../packages/adapters/src/health";
import { approveGeneratedSkill, locateGeneratedSkill, promoteGeneratedSkill, reviewGeneratedSkill } from "../../../packages/skill-engine/src/promotion";
import type { Mode, RunOptions, UserInput } from "../../../packages/shared/src/types";

function getArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1];
  return fallback;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseInit(): { input: UserInput; options: RunOptions } {
  const idea = process.argv.slice(3).find((value: string) => !value.startsWith("--"));
  if (!idea) throw new Error("Missing project idea.");

  const input: UserInput = {
    idea,
    mode: (getArg("--mode", "balanced") as Mode) || "balanced",
    skillLevel: getArg("--skill-level", "intermediate") as UserInput["skillLevel"],
    priority: getArg("--priority", "quality") as UserInput["priority"],
    deliverable: getArg("--deliverable", "app") as UserInput["deliverable"],
  };

  const options: RunOptions = {
    dryRun: hasFlag("--dry-run"),
    outputDir: getArg("--output-dir"),
  };

  return { input, options };
}

async function runInit(): Promise<void> {
  const { input, options } = parseInit();
  const report = await runVerticalSlice(input, options);

  const lines = [
    "",
    "Code Kit Ultra — Phase 4 Run Report",
    "",
    `Summary: ${report.summary}`,
    "",
    "Assumptions:",
    ...(report.assumptions.length ? report.assumptions.map((a) => `- ${a.text}`) : ["- None"]),
    "",
    "Clarifying Questions:",
    ...(report.clarifyingQuestions.length ? report.clarifyingQuestions.map((q) => `- ${q.text}`) : ["- None"]),
    "",
    "Selected Skills:",
    ...report.selectedSkills.map((s) => `- ${s.skillId} (${s.source})${s.promoted ? " [promoted]" : ""}`),
    "",
    "Gates:",
    ...report.gates.map((g) => `- ${g.gate}: ${g.status} | pause=${g.shouldPause}`),
    "",
    "Route Selections:",
    ...report.routeSelections.map((r) => `- ${r.taskId}: ${r.selectedAdapter} for ${r.taskType}`),
    "",
    `Saved JSON report: ${report.paths?.jsonReportPath}`,
    `Saved Markdown report: ${report.paths?.markdownReportPath}`,
    `Saved Gate snapshot: ${report.paths?.gateSnapshotPath}`,
    `Memory file: ${report.paths?.memoryPath}`,
    "",
  ];

  for (const line of lines) console.log(line);
  if (report.paths) saveConsoleOutput(lines, report.paths);
}

async function runAdapters(): Promise<void> {
  const health = await checkAllAdapters();
  for (const item of health) {
    console.log(`${item.adapter}: ok=${item.ok} configured=${item.configured} caps=${item.capabilities.join(",")} :: ${item.message}`);
  }
}

async function runReview(): Promise<void> {
  const skillId = process.argv[3];
  const notes = getArg("--notes", "Reviewed by Phase 4 CLI.") || "Reviewed by Phase 4 CLI.";
  if (!skillId) throw new Error("Usage: npm run ck -- review-skill <skillId> [--notes text]");
  const manifest = reviewGeneratedSkill(skillId, notes);
  console.log(`Reviewed ${manifest.skillId}; status=${manifest.reviewStatus}`);
}

async function runApprove(): Promise<void> {
  const skillId = process.argv[3];
  const notes = getArg("--notes", "Approved by Phase 4 CLI.") || "Approved by Phase 4 CLI.";
  if (!skillId) throw new Error("Usage: npm run ck -- approve-skill <skillId> [--notes text]");
  const manifest = approveGeneratedSkill(skillId, notes);
  console.log(`Approved ${manifest.skillId}; status=${manifest.reviewStatus}`);
}

async function runPromote(): Promise<void> {
  const skillId = process.argv[3];
  if (!skillId) throw new Error("Usage: npm run ck -- promote-skill <skillId>");
  const located = locateGeneratedSkill(skillId);
  const result = promoteGeneratedSkill(skillId);
  markPromotedSkill(skillId, result.promotedManifestPath);
  console.log(`Promoted ${skillId}`);
  console.log(`From: ${result.fromDir}`);
  console.log(`To: ${result.toDir}`);
  console.log(`Manifest: ${result.promotedManifestPath}`);
  console.log(`Original manifest: ${located.manifestPath}`);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case "init":
      return runInit();
    case "adapters":
      return runAdapters();
    case "review-skill":
      return runReview();
    case "approve-skill":
      return runApprove();
    case "promote-skill":
      return runPromote();
    default:
      throw new Error('Usage: npm run ck -- <init|adapters|review-skill|approve-skill|promote-skill> ...');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
