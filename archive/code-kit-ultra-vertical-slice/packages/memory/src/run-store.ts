import fs from "node:fs";
import path from "node:path";
import type { RunReport } from "../../shared/src/types";

export function saveRunReport(report: RunReport): string {
  const dir = path.resolve(".codekit/runs");
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const fullPath = path.join(dir, filename);

  fs.writeFileSync(fullPath, JSON.stringify(report, null, 2), "utf-8");
  return fullPath;
}
