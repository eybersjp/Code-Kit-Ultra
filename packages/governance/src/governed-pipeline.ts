import chalk from "chalk";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import type { ConstraintPolicy } from "./constraint-engine";
import { evaluateConstraints } from "./constraint-engine";
import { verifyIntent } from "./intent-engine";
import { validateBatch } from "./validation-engine";
import { runAdaptiveConsensus } from "./adaptive-consensus";
import type { RiskLevel, AgentVote } from "../../shared/src/governance-types";
import { scoreExecution } from "./confidence-engine";
import { evaluateKillSwitch } from "./kill-switch";
import { createGateApproval, waitForApproval } from "./gate-controller";

export async function runGovernedAutonomy(params: {
  runId: string;
  originalIdea: string;
  batch: BuilderActionBatch;
  policy: ConstraintPolicy;
  votes: AgentVote[];
  riskLevel?: RiskLevel;
  confidenceThreshold?: number;
}) {
  const intent = verifyIntent(params.originalIdea, params.batch);
  const validation = validateBatch(params.batch);
  const constraints = evaluateConstraints(params.batch, params.policy);
  const consensus = runAdaptiveConsensus({
    runId: params.runId,
    summary: params.batch.summary,
    riskLevel: params.riskLevel ?? "medium",
    votes: params.votes,
  });

  const confidence = scoreExecution({ 
    intent, 
    validation, 
    constraints, 
    consensus: {
       finalDecision: consensus.finalDecision === "needs-review" ? "revise" : consensus.finalDecision,
       agreementScore: consensus.approvalScore,
       votes: params.votes as any,
       summary: consensus.summary
    } 
  });
  
  const killSwitch = evaluateKillSwitch({ 
    confidence, 
    constraints, 
    consensus: {
       finalDecision: consensus.finalDecision === "needs-review" ? "revise" : consensus.finalDecision,
       agreementScore: consensus.approvalScore,
       votes: params.votes as any,
       summary: consensus.summary
    }, 
    threshold: params.confidenceThreshold 
  });

  let allowed = !killSwitch.blocked;
  let manualApprovalGiven = false;

  // CHECK: If consensus suggests PAUSE or Risk is HIGH, trigger human gate
  if (consensus.shouldPause || params.riskLevel === "high") {
    console.log(chalk.yellow(`\n[GOVERNANCE] High risk or specialist pause requested. Triggering Human Gate...`));
    
    const approvalId = createGateApproval({
      runId: params.runId,
      title: params.batch.summary,
      gate: consensus.shouldPause ? "Specialist Pause" : "High Risk Enforcement",
      riskLevel: params.riskLevel ?? "high",
      reason: consensus.summary
    });

    manualApprovalGiven = await waitForApproval(approvalId);
    allowed = manualApprovalGiven; // Manual decision overrides automated allowed status in this branch
  }
  
  return { 
    intent, 
    validation, 
    constraints, 
    consensus, 
    confidence, 
    killSwitch, 
    allowed,
    manualApprovalGiven
  };
}
