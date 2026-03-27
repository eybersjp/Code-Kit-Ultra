import type { CommandContext, CommandResult } from "../../../core/src/types";
import { computeConsensus, type ConsensusVote } from "../../../governance/src/consensus-engine";

export async function handleConsensus(command: any, _: CommandContext): Promise<CommandResult> {
  let votes: ConsensusVote[];
  try { votes = JSON.parse(command.text); } catch { return { ok: false, message: "Usage: /ck-consensus <JSON votes[]>" }; }
  const result = computeConsensus(votes);
  return { ok: result.finalDecision !== "reject", message: result.summary, data: result };
}
