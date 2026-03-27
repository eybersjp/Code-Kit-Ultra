import fs from "fs";
import path from "path";

export interface RollbackOutcome {
  runId: string;
  attempted: number;
  reverted: number;
  skipped: number;
  notes: string[];
}

export function rollbackRun(workspaceRoot: string, runId: string): RollbackOutcome {
  const rollbackPath = path.join(workspaceRoot, ".ck", "logs", runId);
  const outcome: RollbackOutcome = {
    runId,
    attempted: 0,
    reverted: 0,
    skipped: 0,
    notes: [],
  };

  if (!fs.existsSync(rollbackPath)) {
    outcome.notes.push("No rollback logs found.");
    return outcome;
  }

  const files = fs.readdirSync(rollbackPath).filter((f) => f.endsWith("-rollback.json"));
  // Reversing the order of rollback files to undo in reverse chronological order
  for (const file of files.reverse()) {
    const raw = fs.readFileSync(path.join(rollbackPath, file), "utf-8");
    const meta = JSON.parse(raw) as { entries: Array<{ type: string; target: string }> };

    // Also reversing the entries within each file
    for (const entry of meta.entries.reverse()) {
      outcome.attempted += 1;

      if (entry.type === "file_write") {
        const target = path.join(workspaceRoot, entry.target);
        if (fs.existsSync(target)) {
          fs.unlinkSync(target)
          outcome.reverted += 1;
          outcome.notes.push(`Deleted generated file: ${entry.target}`);
        } else {
          outcome.skipped += 1;
          outcome.notes.push(`Skipped missing file: ${entry.target}`);
        }
        continue;
      }

      if (entry.type === "dir_create") {
        const target = path.join(workspaceRoot, entry.target);
        if (fs.existsSync(target) && fs.readdirSync(target).length === 0) {
          fs.rmdirSync(target);
          outcome.reverted += 1;
          outcome.notes.push(`Removed empty directory: ${entry.target}`);
        } else {
          outcome.skipped += 1;
          outcome.notes.push(`Skipped non-empty or missing directory: ${entry.target}`);
        }
        continue;
      }

      if (entry.type === "file_append") {
        outcome.skipped += 1;
        outcome.notes.push(`Append rollback not supported automatically: ${entry.target}`);
        continue;
      }

      if (entry.type === "command") {
        outcome.skipped += 1;
        outcome.notes.push(`Command rollback must be handled manually: ${entry.target}`);
        continue;
      }

      outcome.skipped += 1;
      outcome.notes.push(`Unknown rollback entry: ${entry.type}`);
    }
  }

  return outcome;
}
