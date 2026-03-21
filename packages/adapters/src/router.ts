import fs from "node:fs";
import path from "node:path";
import type { RouteSelection, TaskType } from "../../shared/src/types";
import { getAdapterRegistry } from "./registry";
import { loadProjectMemory } from "../../memory/src/run-store";

interface RoutingPolicy { routingPolicies: Array<{ taskType: TaskType; preferred: string[] }> }

function loadPolicy(): RoutingPolicy {
  return JSON.parse(fs.readFileSync(path.resolve("config/routing-policy.json"), "utf-8")) as RoutingPolicy;
}

export async function selectAdapter(taskType: TaskType): Promise<RouteSelection> {
  const registry = getAdapterRegistry();
  const policy = loadPolicy();
  const memory = loadProjectMemory();

  const preferred = policy.routingPolicies.find((p) => p.taskType === taskType)?.preferred ?? ["fallback-stub"];
  const ranked = [...preferred].sort((a, b) => (memory.adapterSuccessCounts[b] || 0) - (memory.adapterSuccessCounts[a] || 0));

  for (const name of ranked) {
    const adapter = registry.find((r) => r.name === name);
    if (!adapter || !adapter.canHandle(taskType)) continue;
    const valid = await adapter.validateConfig();
    if (adapter.kind === "real" && !valid.ok) continue;
    return { taskType, adapterName: adapter.name, reason: `Selected from routing policy for ${taskType}`, mode: adapter.kind };
  }

  const fallback = registry.find((r) => r.name === "fallback-stub")!;
  return { taskType, adapterName: fallback.name, reason: "No preferred adapter available; using fallback.", mode: "stub" };
}

export async function adapterHealthReport() {
  const registry = getAdapterRegistry();
  const results = [];
  for (const adapter of registry) {
    results.push({ name: adapter.name, kind: adapter.kind, ...(await adapter.healthCheck()) });
  }
  return results;
}