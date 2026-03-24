import type { BuilderActionBatch } from "../../agents/src/action-types";
import type { ConstraintPolicy } from "./constraint-engine";
import { evaluateConstraints } from "./constraint-engine";
import { verifyIntent } from "./intent-engine";
import { validateBatch } from "./validation-engine";
import { runAdaptiveConsensus } from "./adaptive-consensus";
import type { RiskLevel, AgentVote } from "../../shared/src/governance-types";
import { scoreExecution } from "./confidence-engine";
import { evaluateKillSwitch } from "./kill-switch";

export function runGovernedAutonomy(params: {
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
  
  return { 
    intent, 
    validation, 
    constraints, 
    consensus, 
    confidence, 
    killSwitch, 
    allowed: !killSwitch.blocked 
  };
}
