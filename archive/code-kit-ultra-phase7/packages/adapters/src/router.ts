import type { RouteSelection, TaskType } from "../../shared/src/types";
import { selectBestRuntime } from "./runtime-selector";
import { getAdapterRegistry } from "./registry";

export async function selectAdapter(taskType: TaskType): Promise<RouteSelection> {
  const selected = await selectBestRuntime(taskType);
  return { taskType, adapterName: selected.adapter.name, reason: selected.reason, mode: selected.adapter.kind };
}

export async function adapterHealthReport() {
  const registry = getAdapterRegistry();
  const results = [];
  for (const adapter of registry) results.push({ name: adapter.name, kind: adapter.kind, ...(await adapter.healthCheck()) });
  return results;
}