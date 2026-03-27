import { saveRunBundle, loadRunBundle, updateReport, updateRunState } from "../../memory/src/run-store";
import type { RunBundle, UserInput } from "../../shared/src/types";
import { userInputSchema } from "../../shared/src/validation";
import { buildRunBundle } from "./run-builder";
import { executeRunBundle } from "./execution-engine";
import { buildMarkdownReport } from "./report-builder";

export async function initRun(input: UserInput): Promise<RunBundle> {
  const parsed = userInputSchema.parse(input);
  const bundle = buildRunBundle(parsed);
  saveRunBundle(bundle);
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
  }
  const executed = await executeRunBundle(bundle);
  executed.reportMarkdown = buildMarkdownReport(executed);
  updateReport(executed.state.runId, executed.reportMarkdown);
  return executed;
}

export function inspectRun(runId: string): RunBundle {
  return loadRunBundle(runId);
}
