import { getDefaultAgentProfiles } from "../../../../packages/agents/src/profiles";
import { updateProfilesFromOutcomes } from "../../../../packages/governance/src";

export function handleAgentProfile(raw?: string): string {
  if (!raw) {
    return JSON.stringify({ profiles: getDefaultAgentProfiles() }, null, 2);
  }

  const payload = JSON.parse(raw);
  const profiles = updateProfilesFromOutcomes(payload.stats ?? []);
  return JSON.stringify({ profiles }, null, 2);
}
