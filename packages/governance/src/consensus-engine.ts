export interface ConsensusVote {
  agent: "planner" | "builder" | "reviewer";
  decision: "approve" | "revise" | "reject";
  confidence: number;
  notes: string[];
}

export interface ConsensusResult {
  finalDecision: "approve" | "revise" | "reject";
  agreementScore: number;
  votes: ConsensusVote[];
  summary: string;
}

export function computeConsensus(votes: ConsensusVote[]): ConsensusResult {
  const approvals = votes.filter((v) => v.decision === "approve").length;
  const revisions = votes.filter((v) => v.decision === "revise").length;
  const rejects = votes.filter((v) => v.decision === "reject").length;
  const agreementScore = Number((Math.max(approvals, revisions, rejects) / Math.max(votes.length, 1)).toFixed(2));

  let finalDecision: "approve" | "revise" | "reject" = "revise";
  if (rejects > 0) finalDecision = "reject";
  else if (approvals === votes.length) finalDecision = "approve";
  else if (revisions > 0) finalDecision = "revise";

  return {
    finalDecision,
    agreementScore,
    votes,
    summary: `Consensus decision: ${finalDecision} with agreement score ${agreementScore}.`,
  };
}
