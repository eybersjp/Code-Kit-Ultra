import fs from "node:fs";
import type { RunPaths, RunReport } from "../../shared/src/types";

export function renderMarkdownReport(report: RunReport): string {
  const assumptions = report.assumptions.length
    ? report.assumptions.map((a) => `- ${a.text} (${a.confidence})`).join("\n")
    : "- None";

  const questions = report.clarifyingQuestions.length
    ? report.clarifyingQuestions.map((q) => `- ${q.text}${q.blocking ? " [blocking]" : ""}`).join("\n")
    : "- None";

  const plan = report.plan.map((p) => `- [${p.phase}] ${p.title} — ${p.doneDefinition}`).join("\n");
  const skills = report.selectedSkills
    .map((s) => `- ${s.skillId} (${s.source}) — ${s.reason}${s.generatedPath ? ` → ${s.generatedPath}` : ""}${s.manifestPath ? ` | manifest: ${s.manifestPath}` : ""}`)
    .join("\n");
  const gates = report.gates
    .map((g) => `- ${g.gate}: ${g.status}; pause=${g.shouldPause}; ${g.reason}`)
    .join("\n");
  const routes = report.routeSelections
    .map((r) => `- ${r.taskId}: ${r.selectedAdapter} handled ${r.taskType} — ${r.policyReason}`)
    .join("\n");
  const adapters = report.adapterExecutions
    .map((a) => `- ${a.taskId}: ${a.adapter} handled ${a.taskType} — ${a.resultSummary}`)
    .join("\n");

  return `# Code Kit Ultra Run Report

## Summary
${report.summary}

## Input
- Idea: ${report.input.idea}
- Mode: ${report.input.mode}
- Dry run: ${report.dryRun}
- Output dir: ${report.outputDir}

## Assumptions
${assumptions}

## Clarifying Questions
${questions}

## Plan
${plan}

## Selected Skills
${skills}

## Gate Decisions
${gates}

## Route Selections
${routes || "- None"}

## Adapter Executions
${adapters || "- None"}

## Created At
${report.createdAt}
`;
}

export function saveMarkdownReport(report: RunReport, paths: RunPaths): void {
  fs.writeFileSync(paths.markdownReportPath, renderMarkdownReport(report), "utf-8");
}
