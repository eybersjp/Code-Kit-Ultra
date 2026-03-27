import fs from "fs";
import path from "path";
import { getRun, savePhaseOutput, setRunStatus } from "../../core/src/run-store";
import { evaluateGates } from "../../gates/src/gate-engine";
import { resolveExecutionPlan } from "./execution-plan";
import { resolveAgentForPhase } from "../../agents/src/router";
import { runAgentPrompt } from "../../agents/src/prompt-runner";
import type { RunPhase } from "../../core/src/types";

const ARTIFACTS_ROOT = path.resolve(process.cwd(), ".ck", "artifacts");

export interface CoordinatorResult {
  status: "blocked" | "awaiting_approval" | "executing" | "completed";
  runId: string;
  completedPhases: RunPhase[];
  pendingPhase?: RunPhase;
  pendingApprovalGate?: string;
  message: string;
}

function ensureArtifactsDir(runId: string) {
  const dir = path.join(ARTIFACTS_ROOT, runId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writePhaseArtifact(runId: string, phase: string, agent: string, result: any) {
  ensureArtifactsDir(runId);
  const filePath = path.join(ARTIFACTS_ROOT, runId, `${phase}.md`);

  const content = `# Phase Artifact: ${phase.toUpperCase()}
- **Agent**: ${agent}
- **Timestamp**: ${new Date().toISOString()}

## Summary
${result.summary}

## Output Payload
\`\`\`json
${JSON.stringify(result.payload, null, 2)}
\`\`\`

${result.recommendations ? `## Recommendations\n${result.recommendations.map((r: string) => `- ${r}`).join("\n")}` : ""}
`;

  fs.writeFileSync(filePath, content);
}

function phaseAlreadyCompleted(run: ReturnType<typeof getRun>, phase: RunPhase): boolean {
  return Boolean(run.outputs[phase]);
}

export async function executeRun(runId: string): Promise<CoordinatorResult> {
  const run = getRun(runId);
  const gateResults = evaluateGates({
    mode: run.mode,
    idea: run.idea,
    outputs: run.outputs,
    approvedGates: run.approvedGates,
  });

  const hardBlock = gateResults.find((g) => g.blocking && !g.passed);
  if (hardBlock) {
    setRunStatus(runId, "blocked", `${hardBlock.gate} blocked: ${hardBlock.reason}`);
    return {
      status: "blocked",
      runId,
      completedPhases: Object.keys(run.outputs) as RunPhase[],
      pendingApprovalGate: hardBlock.gate,
      message: `${hardBlock.gate} blocked: ${hardBlock.reason ?? "Unknown reason"}`,
    };
  }

  const plan = resolveExecutionPlan(run.mode);
  const completedPhases: RunPhase[] = [];

  for (const step of plan) {
    const refreshedRun = getRun(runId);

    if (phaseAlreadyCompleted(refreshedRun, step.phase)) {
      completedPhases.push(step.phase);
      continue;
    }

    if (step.requiresApproval && !refreshedRun.approvedGates.includes(step.phase)) {
      setRunStatus(runId, "awaiting_approval", `Awaiting approval for ${step.phase}`, step.phase);
      return {
        status: "awaiting_approval",
        runId,
        completedPhases,
        pendingPhase: step.phase,
        pendingApprovalGate: step.phase,
        message: `Approval required for ${step.phase}`,
      };
    }

    if (step.executionType === "manual") {
      setRunStatus(runId, "awaiting_approval", `Manual phase pending: ${step.phase}`, step.phase);
      return {
        status: "awaiting_approval",
        runId,
        completedPhases,
        pendingPhase: step.phase,
        pendingApprovalGate: step.phase,
        message: `Manual phase pending: ${step.phase}`,
      };
    }

    setRunStatus(runId, "executing", `Executing ${step.phase}`, step.phase);
    const agent = resolveAgentForPhase(step.phase);
    const result = await runAgentPrompt(agent, {
      runId,
      mode: refreshedRun.mode,
      phase: step.phase,
      idea: refreshedRun.idea,
      priorOutputs: refreshedRun.outputs,
      runContext: refreshedRun.context,
    });

    // Persist real artifact
    writePhaseArtifact(runId, step.phase, agent, result);

    savePhaseOutput(runId, step.phase, agent, result, `${step.phase} completed by ${agent}`);
    completedPhases.push(step.phase);
  }

  setRunStatus(runId, "completed", "All phases completed", "done");
  return {
    status: "completed",
    runId,
    completedPhases,
    message: "Run completed successfully.",
  };
}
