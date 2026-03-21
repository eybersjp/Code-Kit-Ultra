import fs from "node:fs";
import path from "node:path";
import type { RoutingPolicyConfig } from "../../shared/src/contracts";
import type { PersistentMemory, TaskType } from "../../shared/src/types";
import { getAdapterByName, listAdapters } from "./registry";

function loadRoutingPolicy(): RoutingPolicyConfig {
  const file = path.resolve("config/routing-policy.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RoutingPolicyConfig;
}

export function selectAdapterForTask(
  taskType: TaskType,
  memory: PersistentMemory
): { adapter: ReturnType<typeof listAdapters>[number]; reason: string } {
  const config = loadRoutingPolicy();
  const policy = config.routingPolicies.find((entry) => entry.taskType === taskType);

  const successfulForTask = memory.successfulAdapterSelections[taskType] || [];
  const boosted = [...successfulForTask].sort((a, b) => (memory.adapterSuccessCounts[b] || 0) - (memory.adapterSuccessCounts[a] || 0));
  const candidates = Array.from(new Set([...(boosted || []), ...(policy?.preferred || []), config.defaultAdapter]));

  for (const candidate of candidates) {
    const adapter = getAdapterByName(candidate);
    if (adapter && adapter.canHandle(taskType)) {
      const reason = boosted.includes(candidate)
        ? `Selected ${candidate} from memory-assisted routing for ${taskType}.`
        : `Selected ${candidate} from routing policy for ${taskType}.`;
      return { adapter, reason };
    }
  }

  const fallback = listAdapters().find((adapter) => adapter.canHandle(taskType));
  if (!fallback) {
    throw new Error(`No adapter available for task type: ${taskType}`);
  }

  return {
    adapter: fallback,
    reason: `No policy match found; using first compatible adapter ${fallback.name}.`,
  };
}
