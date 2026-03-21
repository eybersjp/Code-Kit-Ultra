import fs from "node:fs";
import path from "node:path";

export function getMetricsSummary() {
  const file = path.resolve(".codekit/memory/project-memory.json");
  if (!fs.existsSync(file)) {
    return { totalExecutions: 0, successRate: 0, topAdapters: [] };
  }
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const executions = data.executionHistory || [];
  const successCount = executions.filter((x: any) => x.ok).length;
  const counts = Object.entries(data.adapterSuccessCounts || {}).map(([name, count]) => ({ name, count }));
  return { totalExecutions: executions.length, successRate: executions.length ? successCount / executions.length : 0, topAdapters: counts };
}