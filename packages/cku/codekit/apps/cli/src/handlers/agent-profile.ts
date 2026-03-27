import { getDefaultAgentProfiles } from "../../../../packages/agents/src/profiles";
import { updateProfilesFromOutcomes } from "../../../../packages/governance/src";

export function handleAgentProfile(raw?: string): string {
  if (!raw) {
    const profiles = getDefaultAgentProfiles();
    return JSON.stringify({ profiles }, null, 2);
  }

  try {
    const payload = JSON.parse(raw);
    const profiles = updateProfilesFromOutcomes(payload.stats ?? []);
    return JSON.stringify({ profiles }, null, 2);
  } catch (e: any) {
    return `Error: Failed to process profile update - ${e.message}`;
  }
}
