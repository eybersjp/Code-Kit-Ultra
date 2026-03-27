import type { BuilderActionBatch } from "../../agents/src/action-types";
import type { ConstraintPolicy } from "./constraint-engine";
import { evaluateConstraints } from "./constraint-engine";
import { verifyIntent } from "./intent-engine";
import { validateBatch } from "./validation-engine";
import { computeConsensus, type ConsensusVote } from "./consensus-engine";
import { scoreExecution } from "./confidence-engine";
import { evaluateKillSwitch } from "./kill-switch";

export function runGovernedAutonomy(params: {
  originalIdea: string;
  batch: BuilderActionBatch;
  policy: ConstraintPolicy;
  votes: ConsensusVote[];
  confidenceThreshold?: number;
}) {
  const intent = verifyIntent(params.originalIdea, params.batch);
  const validation = validateBatch(params.batch);
  const constraints = evaluateConstraints(params.batch, params.policy);
  const consensus = computeConsensus(params.votes);
  const confidence = scoreExecution({ intent, validation, constraints, consensus });
  const killSwitch = evaluateKillSwitch({ confidence, constraints, consensus, threshold: params.confidenceThreshold });
  return { intent, validation, constraints, consensus, confidence, killSwitch, allowed: !killSwitch.blocked };
}
