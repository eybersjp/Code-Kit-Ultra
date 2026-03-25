import path from "node:path";
import { loadRunBundle, listRunIds } from "../../../../packages/memory/src/run-store";

const CK_DIR = path.resolve(".codekit");

export class RunReader {
  public static getRuns() {
    const runIds = listRunIds();
    return runIds.map((id: string) => {
      const bundle = loadRunBundle(id);
      if (!bundle) return null;
      return {
        ...bundle,
        runId: id,
        label: bundle.intake.idea || "Untitled Run",
        status: bundle.state.status
      };
    }).filter((r: any) => r !== null)
      .sort((a: any, b: any) => new Date(b!.intake.createdAt).getTime() - new Date(a!.intake.createdAt).getTime());
  }

  public static getRun(runId: string) {
    return loadRunBundle(runId);
  }

  public static getTimeline(runId: string) {
    const bundle = this.getRun(runId);
    if (!bundle) return [];
    
    // Map Phase 9.3 Log to UI Timeline
    return bundle.executionLog.steps.map((step: any) => ({
      at: step.startedAt,
      phase: step.title,
      event: step.status,
      detail: step.output || step.error || "",
      simulation: step.simulationSummary,
      risk: step.risk,
      verification: step.verificationStatus,
      verificationDetail: step.verificationSummary,
      fix: step.fixSuggestion
    }));
  }
}
