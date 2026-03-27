import fs from "node:fs";
import path from "node:path";

function auditPath() {
  return path.resolve(".codekit/audit/promotion-audit.log");
}

export function writeAudit(entry: Record<string, unknown>) {
  const file = auditPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n", "utf-8");
}