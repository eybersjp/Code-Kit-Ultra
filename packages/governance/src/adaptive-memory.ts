import type { AgentProfile, SpecialistAgent } from "../../shared/src/governance-types";
import { getDefaultAgentProfiles } from "../../agents/src/profiles";

export interface AgentOutcomeStat {
  agent: SpecialistAgent;
  approvalsAligned: number;
  approvalsMisaligned: number;
}

export function updateProfilesFromOutcomes(stats: AgentOutcomeStat[]): AgentProfile[] {
  const profiles = getDefaultAgentProfiles();

  return profiles.map((profile) => {
    const stat = stats.find((s) => s.agent === profile.agent);
    if (!stat) return profile;

    const total = stat.approvalsAligned + stat.approvalsMisaligned;
    if (total === 0) return profile;

    const successRate = stat.approvalsAligned / total;
    const blendedReliability = Math.max(0.5, Math.min(0.98, (profile.reliability * 0.6) + (successRate * 0.4)));

    return {
      ...profile,
      reliability: blendedReliability,
    };
  });
}
