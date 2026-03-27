import fs from "node:fs";
import path from "node:path";
import type { TaskType } from "../../shared/src/types";
import { getAdapterRegistry } from "./registry";
import { loadProjectMemory } from "../../memory/src/run-store";

interface RuntimePolicy {
  specialistPreference: Record<string, string[]>;
  fallbackStrategy: string;
  retryPolicy: { maxAttempts: number; backoffMs: number };
}

function loadRuntimePolicy(): RuntimePolicy {
  return JSON.parse(fs.readFileSync(path.resolve("config/runtime-policy.json"), "utf-8")) as RuntimePolicy;
}

export async function selectBestRuntime(taskType: TaskType) {
  const registry = getAdapterRegistry();
  const runtime = loadRuntimePolicy();
  const memory = loadProjectMemory();
  const preferred = runtime.specialistPreference[taskType] ?? ["fallback-stub"];
  const ranked = [...preferred].sort((a, b) => (memory.adapterSuccessCounts[b] || 0) - (memory.adapterSuccessCounts[a] || 0));

  for (const name of ranked) {
    const adapter = registry.find((r) => r.name === name);
    if (!adapter || !adapter.canHandle(taskType)) continue;
    const valid = await adapter.validateConfig();
    if (adapter.kind === "real" && valid.ok) return { adapter, reason: `Selected real adapter ${name} using runtime policy.` };
    if (adapter.kind === "stub") return { adapter, reason: `Selected stub adapter ${name} as safe fallback.` };
  }

  const fallback = registry.find((r) => r.name === "fallback-stub");
  if (!fallback) throw new Error("Fallback adapter missing");
  return { adapter: fallback, reason: "No preferred adapter available; using fallback-stub." };
}