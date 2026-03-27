import { appendAuditEvent } from "../../audit/src/index";
import { loadRunBundle, saveRunBundle, updateReport, updateRunState } from "../../memory/src/run-store";
import type { RunBundle, UserInput } from "../../shared/src/types";
import { userInputSchema } from "../../shared/src/validation";
import { buildRunBundle } from "./run-builder";
import { executeRunBundle, retryTask, rollbackTask } from "./execution-engine";
import { buildMarkdownReport } from "./report-builder";

export async function initRun(input: UserInput): Promise<RunBundle> {
  const parsed = userInputSchema.parse(input);
  const bundle = buildRunBundle(parsed);
  saveRunBundle(bundle);
  appendAuditEvent({ runId: bundle.state.runId, actor: "system", role: "system", action: "RUN_CREATED", details: { idea: bundle.intake.idea } });
  const executed = await executeRunBundle(bundle);
  executed.reportMarkdown = buildMarkdownReport(executed);
  updateReport(executed.state.runId, executed.reportMarkdown);
  return executed;
}

export async function resumeRun(runId: string, autoApprove = false): Promise<RunBundle> {
  const bundle = loadRunBundle(runId);
  if (autoApprove) {
    bundle.state.approved = true;
    bundle.state.approvalRequired = false;
    bundle.state.pauseReason = undefined;
    bundle.state.updatedAt = new Date().toISOString();
    updateRunState(runId, bundle.state);
    appendAuditEvent({ runId, actor: "system", role: "system", action: "RUN_APPROVED" });
  }
  const executed = await executeRunBundle(bundle);
  executed.reportMarkdown = buildMarkdownReport(executed);
  updateReport(executed.state.runId, executed.reportMarkdown);
  return executed;
}

export async function retryStep(runId: string, stepId?: string): Promise<RunBundle> {
  const updated = await retryTask(runId, stepId);
  updated.reportMarkdown = buildMarkdownReport(updated);
  updateReport(updated.state.runId, updated.reportMarkdown);
  return updated;
}

export async function rollbackStep(runId: string, stepId?: string): Promise<RunBundle> {
  const updated = await rollbackTask(runId, stepId);
  updated.reportMarkdown = buildMarkdownReport(updated);
  updateReport(updated.state.runId, updated.reportMarkdown);
  return updated;
}

export function inspectRun(runId: string): RunBundle {
  return loadRunBundle(runId);
}
