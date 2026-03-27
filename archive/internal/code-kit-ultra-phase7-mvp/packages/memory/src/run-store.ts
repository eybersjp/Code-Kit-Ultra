import fs from "node:fs";
import path from "node:path";
import type { RunReport } from "../../shared/src/types";

export interface SavedRunPaths {
  jsonPath: string;
  markdownPath: string;
}

export function saveRunReport(report: RunReport, markdown: string): SavedRunPaths {
  const dir = path.resolve(".codekit/runs");
  fs.mkdirSync(dir, { recursive: true });

  const filenameBase = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(dir, `${filenameBase}.json`);
  const markdownPath = path.join(dir, `${filenameBase}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(markdownPath, markdown, "utf-8");

  return { jsonPath, markdownPath };
}
