import fs from "fs";
import path from "path";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeActionLog(workspaceRoot: string, runId: string, filename: string, content: string): string {
  const dir = path.join(workspaceRoot, ".ck", "logs", runId);
  ensureDir(dir);
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, content, "utf-8");
  return fullPath;
}

export function writeArtifact(workspaceRoot: string, runId: string, phase: string, markdown: string): string {
  const dir = path.join(workspaceRoot, ".ck", "artifacts", runId);
  ensureDir(dir);
  const fullPath = path.join(dir, `${phase}.md`);
  fs.writeFileSync(fullPath, markdown, "utf-8");
  return fullPath;
}
