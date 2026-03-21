import fs from "node:fs";
import path from "node:path";

export function recordExecution(adapter: string, taskType: string, ok: boolean) {
  const file = path.resolve(".codekit/memory/project-memory.json");
  const seed = { executionHistory: [], adapterSuccessCounts: {} as Record<string, number> };
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : seed;
  data.executionHistory.push({ adapter, taskType, ok, at: new Date().toISOString() });
  if (ok) data.adapterSuccessCounts[adapter] = (data.adapterSuccessCounts[adapter] || 0) + 1;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}