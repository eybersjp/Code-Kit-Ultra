import fs from "fs";
import path from "path";
import type { ConstraintPolicy } from "./constraint-engine";

function policyDir(workspaceRoot: string) {
  return path.join(workspaceRoot, ".ck", "policies");
}

export function saveConstraintPolicy(workspaceRoot: string, runId: string, policy: ConstraintPolicy): string {
  fs.mkdirSync(policyDir(workspaceRoot), { recursive: true });
  const fullPath = path.join(policyDir(workspaceRoot), `${runId || "default"}-constraints.json`);
  fs.writeFileSync(fullPath, JSON.stringify(policy, null, 2), "utf-8");
  return fullPath;
}

export function loadConstraintPolicy(workspaceRoot: string, runId: string): ConstraintPolicy | null {
  const fullPath = path.join(policyDir(workspaceRoot), `${runId || "default"}-constraints.json`);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}
