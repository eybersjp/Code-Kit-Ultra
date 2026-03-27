import type { RunBundle } from "../../shared/src/types";

function bullet(values: string[]): string {
  return values.length ? values.map((v) => `- ${v}`).join("\n") : "- None";
}

export function buildMarkdownReport(bundle: RunBundle): string {
  return `# Code Kit Ultra Phase 8 Run Report

## Run
- Run ID: ${bundle.state.runId}
- Created At: ${bundle.state.createdAt}
- Updated At: ${bundle.state.updatedAt}
- Status: ${bundle.state.status}
- Approval Required: ${bundle.state.approvalRequired}
- Approved: ${bundle.state.approved}

## Input
- Idea: ${bundle.intake.idea}
- Mode: ${bundle.intake.input.mode}
- Skill Level: ${bundle.intake.input.skillLevel ?? "not set"}
- Priority: ${bundle.intake.input.priority ?? "not set"}
- Deliverable: ${bundle.intake.input.deliverable ?? "not set"}

## Assumptions
${bullet(bundle.intake.assumptions.map((a) => `${a.text} [${a.confidence}]`))}

## Clarifying Questions
${bullet(bundle.intake.clarifyingQuestions.map((q) => `${q.text} | blocking=${q.blocking}`))}

## Selected Skills
${bullet(bundle.plan.selectedSkills.map((s) => `${s.skillId} (${s.source}) - ${s.reason}`))}

## Plan
${bullet(bundle.plan.tasks.map((task) => `[${task.phase}] ${task.title} -> adapter=${task.adapterId}`))}

## Gates
${bullet(bundle.gates.map((gate) => `${gate.gate}: ${gate.status} | pause=${gate.shouldPause} | ${gate.reason}`))}

## Adapter Summary
${bullet(bundle.adapters.executions.map((e) => `${e.taskId}: ${e.adapter} -> ${e.status} | attempts=${e.attempts} | ${e.output}`))}

## Execution Log
${bullet(bundle.executionLog.steps.map((step) => `${step.stepId}: ${step.status} | adapter=${step.adapter} | attempt=${step.attempt} | ${step.output ?? step.error ?? "no message"}`))}
`;
}
