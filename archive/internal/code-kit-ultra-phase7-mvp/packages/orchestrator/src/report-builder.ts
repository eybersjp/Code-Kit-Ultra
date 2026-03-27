import type { RunReport } from "../../shared/src/types";

function listOrFallback(values: string[]): string {
  return values.length ? values.map((v) => `- ${v}`).join("\n") : "- None";
}

export function buildMarkdownReport(report: RunReport): string {
  return `# Code Kit Ultra Run Report

## Input
- Idea: ${report.input.idea}
- Mode: ${report.input.mode}
- Skill Level: ${report.input.skillLevel ?? "not set"}
- Priority: ${report.input.priority ?? "not set"}
- Deliverable: ${report.input.deliverable ?? "not set"}
- Created At: ${report.createdAt}

## Summary
${report.summary}

## Assumptions
${listOrFallback(report.assumptions.map((a) => `${a.text} [${a.confidence}]`))}

## Clarifying Questions
${listOrFallback(report.clarifyingQuestions.map((q) => `${q.text} | blocking=${q.blocking}`))}

## Plan
${listOrFallback(report.plan.map((p) => `[${p.phase}] ${p.title} -> ${p.doneDefinition}`))}

## Selected Skills
${listOrFallback(report.selectedSkills.map((s) => `${s.skillId} (${s.source}) - ${s.reason}`))}

## Gates
${listOrFallback(report.gates.map((g) => `${g.gate}: ${g.status} | pause=${g.shouldPause} | ${g.reason}`))}

## Adapter Executions
${listOrFallback(report.adapterExecutions.map((e) => `${e.taskId}: ${e.adapter} -> ${e.status} | ${e.output}`))}

## Pause State
- shouldPause: ${report.shouldPause}
`;
}
