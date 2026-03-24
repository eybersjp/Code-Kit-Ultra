import type { Phase, RunReport, Mode, ClarificationResult, Task, SelectedSkill } from "../../shared/src";
import { runIntake } from "./intake";
import { buildPlanFromClarification } from "./planner";
import { selectSkills } from "../../skill-engine/src";
import { evaluateGates } from "./gate-manager";
import { runActionBatch } from "./action-runner";
import type { BuilderActionBatch } from "../../agents/src/action-types";

export interface PhaseContext {
  idea: string;
  mode: Mode;
  approvedGates: string[];
  report: Partial<RunReport>;
}

export type PhaseHandler = (context: PhaseContext) => Promise<{
  nextPhase: Phase | null;
  updates: Partial<RunReport>;
  status: "success" | "blocked" | "awaiting-approval";
}>;

export const PHASE_HANDLERS: Record<Phase, PhaseHandler> = {
  intake: async (ctx) => {
    const intakeResult = runIntake({ idea: ctx.idea, mode: ctx.mode });
    return {
      nextPhase: "planning",
      updates: { intakeResult, assumptions: intakeResult.assumptions, clarifyingQuestions: intakeResult.clarifyingQuestions },
      status: "success",
    };
  },
  planning: async (ctx) => {
    if (!ctx.report.intakeResult) throw new Error("Intake result missing");
    const plan = buildPlanFromClarification(ctx.report.intakeResult);
    return {
      nextPhase: "skills",
      updates: { plan },
      status: "success",
    };
  },
  skills: async (ctx) => {
    if (!ctx.report.intakeResult || !ctx.report.plan) throw new Error("Missing data for skill selection");
    const selectedSkills = selectSkills({
      clarification: ctx.report.intakeResult as ClarificationResult,
      plan: ctx.report.plan as Task[],
    });
    return {
      nextPhase: "gating",
      updates: { selectedSkills },
      status: "success",
    };
  },
  gating: async (ctx) => {
    const gateResult = evaluateGates({
      clarificationResult: ctx.report.intakeResult as ClarificationResult,
      plan: ctx.report.plan as Task[],
      selectedSkills: ctx.report.selectedSkills as SelectedSkill[],
      mode: ctx.mode,
      approvedGates: ctx.approvedGates,
    });

    const status = gateResult.overallStatus === "pass" ? "success" : 
                   gateResult.overallStatus === "blocked" ? "blocked" : "awaiting-approval";

    return {
      nextPhase: status === "success" ? "building" : "gating", // Stay in gating if blocked/review
      updates: { gates: gateResult.decisions, overallGateStatus: gateResult.overallStatus, status: status === "success" ? "success" : (status === "blocked" ? "blocked" : "awaiting-approval") },
      status: status as any,
    };
  },
  building: async (ctx) => {
    const runId = ctx.report.id || "run-dev";
    const workspaceRoot = process.cwd();

    // v1.1.0 Refactor: Use the centralized intelligence layer (adapters)
    // instead of hardcoded mock batches.
    const { runAgentPrompt } = await import("../../agents/src/executor");
    const agentResult = runAgentPrompt({
      projectIdea: ctx.idea,
      mode: ctx.mode,
      preferredAction: "generate-files",
      report: ctx.report as RunReport,
    });

    // In a fully developed system, the agentResult would return 
    // real actions. For now, it returns the summary of its intent.
    const batch: BuilderActionBatch = {
      runId,
      phase: "build",
      generatedBy: agentResult.adapterId,
      summary: agentResult.summary,
      actions: [
        { 
          type: "create_dir", 
          path: "build", 
          reason: "Base build directory requested by agent." 
        },
        { 
          type: "write_file", 
          path: "build/manifest.json", 
          content: JSON.stringify({ 
            status: "ready", 
            adapter: agentResult.adapterName,
            at: new Date().toISOString() 
          }), 
          reason: `Record implementation attempt by ${agentResult.adapterName}.` 
        }
      ],
    };

    // 1. Generate preview and assess risk
    const { writeExecutionPreview } = await import("./execution-preview");
    const preview = writeExecutionPreview(workspaceRoot, batch);

    // 2. Check if mode policy requires approval for any action
    const { getModePolicy } = await import("./mode-controller");
    const policy = getModePolicy(ctx.mode);

    const requiresApproval =
      (preview.riskSummary.high > 0 && policy.execution.requireApprovalForHighRisk) ||
      (preview.riskSummary.medium > 0 && policy.execution.requireApprovalForMediumRisk);

    const isGateApproved = ctx.approvedGates.includes("building");

    if (requiresApproval && !isGateApproved) {
      // 3. Queue the batch and pause pipeline
      const { createQueuedBatch } = await import("./batch-queue");
      const queued = createQueuedBatch({
        workspaceRoot,
        runId,
        phase: batch.phase,
        riskSummary: preview.riskSummary,
        generatedBy: batch.generatedBy,
        summary: batch.summary,
        batch,
      });

      return {
        nextPhase: "building",
        updates: {
          summary: `Build phase requires approval for action batch ${queued.id}.`,
          status: "awaiting-approval",
        },
        status: "awaiting-approval",
      };
    }

    // 4. Auto-execute if safe or approved
    const result = runActionBatch({
      workspaceRoot,
      mode: ctx.mode,
      batch,
      approvedGates: ctx.approvedGates,
    });

    return {
      nextPhase: result.results.some(r => r.status === "blocked") ? "building" : "testing",
      updates: {
        summary: result.summary,
        status: result.results.some(r => r.status === "blocked") ? "failure" : (result.results.some(r => r.status === "approval_required") ? "awaiting-approval" : "success")
      },
      status: result.results.some(r => r.status === "blocked") ? "blocked" : (result.results.some(r => r.status === "approval_required") ? "awaiting-approval" : "success"),
    };
  },
  testing: async (ctx) => {
    // Placeholder for actual test logic
    return {
      nextPhase: "reviewing",
      updates: { summary: "Testing phase completed (SIMULATED)." },
      status: "success",
    };
  },
  reviewing: async (ctx) => {
     // Placeholder for actual review logic
    return {
      nextPhase: "deployment",
      updates: { summary: "Review phase completed (SIMULATED)." },
      status: "success",
    };
  },
  deployment: async (ctx) => {
    // Placeholder for actual deployment logic
    return {
      nextPhase: null,
      updates: { status: "success", summary: "Deployment completed (SIMULATED). Pipeline finished." },
      status: "success",
    };
  },
};

export async function runOrchestrationStep(report: RunReport): Promise<RunReport & { isFinished: boolean }> {
  const handler = PHASE_HANDLERS[report.currentPhase];
  if (!handler) throw new Error(`Unknown phase: ${report.currentPhase}`);

  const context: PhaseContext = {
    idea: report.input.idea,
    mode: report.input.mode,
    approvedGates: report.approvedGates,
    report,
  };

  const result = await handler(context);
  
  const updatedReport: RunReport = {
    ...report,
    ...result.updates,
    updatedAt: new Date().toISOString(),
  };

  let isFinished = false;
  if (result.status === "success") {
    if (result.nextPhase) {
      updatedReport.completedPhases = [...(report.completedPhases || []), report.currentPhase];
      updatedReport.currentPhase = result.nextPhase;
      updatedReport.status = "in-progress";
    } else {
      isFinished = true;
      updatedReport.status = "success";
    }
  } else {
    updatedReport.status = result.status === "blocked" ? "blocked" : "awaiting-approval";
  }

  return { ...updatedReport, isFinished };
}
