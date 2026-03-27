import { loadProjectMemory } from "../../memory/src/run-store";

export function getMetricsSummary() {
  const mem = loadProjectMemory();
  const totalExecutions = mem.executionHistory.length;
  const successCount = mem.executionHistory.filter((x) => x.ok).length;
  const adapters = Object.entries(mem.adapterSuccessCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalExecutions,
    successRate: totalExecutions ? successCount / totalExecutions : 0,
    topAdapters: adapters.slice(0, 10)
  };
}