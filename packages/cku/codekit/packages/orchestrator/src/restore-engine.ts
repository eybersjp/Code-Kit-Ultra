import fs from "fs";
import path from "path";

export interface RestoreOutcome {
  runId: string;
  restored: number;
  removed: number;
  skipped: number;
  notes: string[];
}

export function restoreFromManifest(workspaceRoot: string, runId: string, phase: string): RestoreOutcome {
  const manifestPath = path.join(workspaceRoot, ".ck", "backups", runId, `${phase}-backup-manifest.json`);
  const outcome: RestoreOutcome = {
    runId,
    restored: 0,
    removed: 0,
    skipped: 0,
    notes: [],
  };

  if (!fs.existsSync(manifestPath)) {
    outcome.notes.push(`No backup manifest found for phase: ${phase}`);
    return outcome;
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Array<{
    originalPath: string;
    backupPath: string;
    existedBefore: boolean;
  }>;

  for (const entry of entries.slice().reverse()) {
    const original = path.join(workspaceRoot, entry.originalPath);
    const backup = path.join(workspaceRoot, entry.backupPath);

    if (entry.existedBefore) {
      if (fs.existsSync(backup)) {
        fs.mkdirSync(path.dirname(original), { recursive: true });
        fs.copyFileSync(backup, original);
        outcome.restored += 1;
        outcome.notes.push(`Restored ${entry.originalPath}`);
      } else {
        outcome.skipped += 1;
        outcome.notes.push(`Missing backup for ${entry.originalPath}`);
      }
      continue;
    }

    if (fs.existsSync(original)) {
      fs.unlinkSync(original);
      outcome.removed += 1;
      outcome.notes.push(`Removed newly created file ${entry.originalPath}`);
    } else {
      outcome.skipped += 1;
      outcome.notes.push(`Skipped missing generated file ${entry.originalPath}`);
    }
  }

  return outcome;
}
