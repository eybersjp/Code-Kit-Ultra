import fs from "node:fs";
import path from "node:path";
import type { RouteSelection, TaskType } from "../../shared/src/types";
import { loadProjectMemory } from "../../memory/src/run-store";
import { selectBestRuntime } from "./runtime-selector";
import { getAdapterRegistry } from "./registry";

interface RoutingPolicy { routingPolicies: Array<{ taskType: TaskType; preferred: string[] }> }

function loadPolicy(): RoutingPolicy {
  return JSON.parse(fs.readFileSync(path.resolve("config/routing-policy.json"), "utf-8")) as RoutingPolicy;
}

export async function selectAdapter(taskType: TaskType): Promise<RouteSelection> {
  const policy = loadPolicy();
  const memory = loadProjectMemory();
  const preferred = policy.routingPolicies.find((p) => p.taskType === taskType)?.preferred ?? ["fallback-stub"];
  const ranked = [...preferred].sort((a, b) => (memory.adapterSuccessCounts[b] || 0) - (memory.adapterSuccessCounts[a] || 0));
  const selected = await selectBestRuntime(taskType, ranked);
  return {
    taskType,
    adapterName: selected.adapter.name,
    reason: selected.reason,
    mode: selected.adapter.kind
  };
}

export async function adapterHealthReport() {
  const registry = getAdapterRegistry();
  const results = [];
  for (const adapter of registry) {
    results.push({ name: adapter.name, kind: adapter.kind, ...(await adapter.healthCheck()) });
  }
  return results;
}