import type { TaskType } from "../../shared/src/types";
import { getAdapterRegistry } from "./registry";

export async function selectBestRuntime(taskType: TaskType, preferredNames: string[]) {
  const registry = getAdapterRegistry();

  for (const name of preferredNames) {
    const adapter = registry.find((r) => r.name === name);
    if (!adapter || !adapter.canHandle(taskType)) continue;

    const valid = await adapter.validateConfig();
    if (adapter.kind === "real" && valid.ok) {
      return { adapter, reason: `Selected real adapter ${name} with valid credentials.` };
    }
    if (adapter.kind === "stub") {
      return { adapter, reason: `Selected stub adapter ${name} as safe fallback.` };
    }
  }

  const fallback = registry.find((r) => r.name === "fallback-stub");
  if (!fallback) throw new Error("Fallback adapter missing");
  return { adapter: fallback, reason: "No preferred adapter available; using fallback-stub." };
}