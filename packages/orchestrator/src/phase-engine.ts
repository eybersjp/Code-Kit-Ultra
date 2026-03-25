import type { Phase, RunReport, Mode, ClarificationResult, Task, SelectedSkill } from "../../shared/src";
import { runIntake } from "./intake";
import { buildPlanFromClarification } from "./planner";
import { selectSkills } from "../../skill-engine/src";
import { evaluateGates } from "./gate-manager";
import { runActionBatch } from "./action-runner";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import { runGovernedAutonomy } from "../../governance/src/governed-pipeline";
import { loadConstraintPolicy } from "../../governance/src/policy-store";
import type { AgentVote, RiskLevel } from "../../shared/src/governance-types";
import { TimelineBuilder, buildGovernanceTrace, saveGovernanceTrace, saveTimeline, saveMarkdownReport, renderGovernanceMarkdownReport } from "../../observability/src";
import { executeRunBundle } from "./execution-engine";
import { buildInitialPlan } from "./planner";
import { updateIntake, updatePlan, updateRunState, loadRunBundle } from "../../memory/src/run-store";
import type { RunBundle, PlanArtifact, IntakeArtifact, RunState } from "../../shared/src/types";

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
    const runId = ctx.report.id || `run-${Date.now()}`;
    
    // Phase 8: Transition to RunBundle for real execution
    let bundle = loadRunBundle(runId);
    
    if (!bundle) {
      if (!ctx.report.input) {
        throw new Error("Cannot initialize RunBundle: ctx.report.input is undefined.");
      }
      // Initialize full Phase 8 Bundle if not present
      const tasks = buildInitialPlan(ctx.report.input);
      const intake: IntakeArtifact = {
        runId,
        createdAt: new Date().toISOString(),
        idea: ctx.idea,
        input: ctx.report.input,
        assumptions: ctx.report.assumptions || [],
        clarifyingQuestions: ctx.report.clarifyingQuestions || [],
      };
      const plan: PlanArtifact = {
        runId,
        createdAt: new Date().toISOString(),
        summary: "Generated real execution plan (Phase 8)",
        selectedSkills: (ctx.report.selectedSkills || []).map(s => ({ skillId: s.skillId, reason: s.reason, source: "generated" })),
        tasks,
      };
      const state: RunState = {
        runId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStepIndex: 0,
        status: "planned",
        approvalRequired: false,
        approved: ctx.approvedGates.includes("building"),
      };
      
      bundle = {
        intake,
        plan,
        state,
        gates: [],
        adapters: { runId, createdAt: intake.createdAt, executions: [] },
        executionLog: { runId, createdAt: intake.createdAt, steps: [] },
        auditLog: { runId, createdAt: intake.createdAt, updatedAt: intake.createdAt, events: [] },
        reportMarkdown: "",
      };
      
      // Persist the bundle
      updateIntake(runId, intake);
      updatePlan(runId, plan);
      updateRunState(runId, state);
    }

    // Delegate to the new execution engine
    const updatedBundle = await executeRunBundle(bundle as RunBundle);
    
    const isPaused = updatedBundle.state.status === "paused";
    const isFailed = updatedBundle.state.status === "failed";
    const isCompleted = updatedBundle.state.status === "completed";

    return {
      nextPhase: isCompleted ? "testing" : "building",
      updates: {
        id: runId,
        summary: isPaused ? updatedBundle.state.pauseReason : (isFailed ? "Execution failed" : "Execution successful"),
        status: isPaused ? "awaiting-approval" : (isFailed ? "failure" : (isCompleted ? "success" : "in-progress")),
      },
      status: isPaused ? "awaiting-approval" : (isFailed ? "failure" as any : "success"),
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
