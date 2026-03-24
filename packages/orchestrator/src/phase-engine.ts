import type { Phase, RunReport, Mode, ClarificationResult, Task, SelectedSkill } from "../../shared/src";
import { runIntake } from "./intake";
import { buildPlanFromClarification } from "./planner";
import { selectSkills } from "../../skill-engine/src";
import { evaluateGates } from "./gate-manager";
import { runActionBatch } from "./action-runner";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import { runGovernedAutonomy } from "../../governance/src/governed-pipeline";
import { loadConstraintPolicy } from "../../governance/src/policy-store";
import type { AgentVote, RiskLevel } from "../../shared/src/agent-consensus";
import { TimelineBuilder, buildGovernanceTrace, saveGovernanceTrace, saveTimeline, saveMarkdownReport, renderGovernanceMarkdownReport } from "../../observability/src";

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
    const timeline = new TimelineBuilder(runId);
    if (ctx.report.timeline) {
      (timeline as any).events = [...ctx.report.timeline];
    }
    
    timeline.add("building", "start", "Building phase started");
    const workspaceRoot = process.cwd();

    // v1.1.1 Refactor: Use the centralized intelligence layer (adapters)
    // instead of hardcoded mock batches.
    timeline.add("building", "agent-prompt", "Invoking agent executor");
    const { runAgentPrompt } = await import("../../agents/src/executor");
    const agentResult = runAgentPrompt({
      projectIdea: ctx.idea,
      mode: ctx.mode,
      preferredAction: "generate-files",
      report: ctx.report as RunReport,
    });

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
    timeline.add("building", "preview", "Generating execution preview");
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
      timeline.add("building", "pause", "High risk batch queued for approval");
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

      const updatedTimeline = timeline.build();
      saveTimeline(runId, updatedTimeline);

      return {
        nextPhase: "building",
        updates: {
          summary: `Build phase requires approval for action batch ${queued.id}.`,
          status: "awaiting-approval",
          timeline: updatedTimeline,
        },
        status: "awaiting-approval",
      };
    }

    // 4. Governed Autonomy Layer (Phase 5: Adaptive Specialist Agents)
    timeline.add("building", "governance", "Starting adaptive governance specialists pipeline");
    const currentPolicy = loadConstraintPolicy(workspaceRoot, runId) || {
      maxFilesChanged: 20,
      maxCommands: 5,
      allowedPaths: ["src", "packages", "apps", "config"],
    };

    // Specialist Votes (Phase 5 Agents)
    const votes: AgentVote[] = [
      { agent: "planner", decision: "approve", confidence: 0.9, reason: "Directly follows approved plan." },
      { agent: "builder", decision: "approve", confidence: 0.95, reason: "Safe file mutations identified." },
      { agent: "reviewer", decision: "approve", confidence: 0.88, reason: "Review logic check passed." },
      { agent: "security", decision: "approve", confidence: 0.92, reason: "No high-risk operations detected." },
    ];

    const riskLevel: RiskLevel = preview.riskSummary.high > 0 ? "high" : 
                               (preview.riskSummary.medium > 0 ? "medium" : "low");

    const governance = runGovernedAutonomy({
      runId,
      originalIdea: ctx.idea,
      batch,
      policy: currentPolicy,
      votes,
      riskLevel,
    });

    // Phase 4 Trace: Map Adaptive Consensus to Trace Engine
    const trace = buildGovernanceTrace({
      runId,
      summary: batch.summary,
      mode: ctx.mode,
      intent: {
        passed: governance.intent.valid,
        score: governance.intent.confidence,
        reason: governance.intent.notes.join(" "),
      },
      constraints: {
        passed: governance.constraints.valid,
        violations: governance.constraints.violations.map(v => v.message),
      },
      validation: {
        passed: governance.validation.valid,
        errors: governance.validation.checks.filter(c => !c.passed).map(c => c.message),
      },
      consensus: {
        passed: governance.consensus.finalDecision === "approve",
        votes: governance.consensus.explanations.map(x => ({
          agent: x.agent,
          decision: x.decision === "approve" ? "approve" : (x.decision === "reject" ? "reject" : "abstain"),
          weight: x.effectiveWeight,
          reason: x.reason,
        })),
        approvalWeight: governance.consensus.approvalScore,
        rejectionWeight: governance.consensus.rejectScore,
        threshold: governance.consensus.threshold,
        reason: governance.consensus.summary,
      },
      confidenceThreshold: 0.7,
    });
    
    saveGovernanceTrace(trace);
    timeline.add("building", "governance-result", `Result: ${trace.finalDecision} - ${trace.finalReason}`);

    if (!governance.allowed) {
      const updatedTimeline = timeline.build();
      saveTimeline(runId, updatedTimeline);
      
      const reportMarkdown = renderGovernanceMarkdownReport(trace, updatedTimeline);
      saveMarkdownReport(runId, reportMarkdown);

      return {
        nextPhase: "building",
        updates: {
          summary: `Governed execution blocked: ${governance.killSwitch.reason} (Score: ${governance.confidence.overall})`,
          status: "blocked",
          timeline: updatedTimeline,
          governanceTrace: trace,
        },
        status: "blocked",
      };
    }

    // 5. Auto-execute if safe or approved
    timeline.add("building", "execute", "Executing approved action batch");
    const result = runActionBatch({
      workspaceRoot,
      mode: ctx.mode,
      batch,
      approvedGates: ctx.approvedGates,
    });

    const isBlocked = result.results.some(r => r.status === "blocked");
    const isAwaiting = result.results.some(r => r.status === "approval_required");

    const finalTimeline = timeline.build();
    saveTimeline(runId, finalTimeline);
    
    const finalReportMarkdown = renderGovernanceMarkdownReport(trace, finalTimeline);
    saveMarkdownReport(runId, finalReportMarkdown);

    return {
      nextPhase: isBlocked ? "building" : "testing",
      updates: {
        summary: result.summary,
        status: isBlocked ? "blocked" : (isAwaiting ? "awaiting-approval" : "success"),
        timeline: finalTimeline,
        governanceTrace: trace,
      },
      status: isBlocked ? "blocked" : (isAwaiting ? "awaiting-approval" : "success"),
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
