import fs from "fs";
import path from "path";
import { writeJsonRecord } from "./log-writer";

export interface BackupEntry {
  originalPath: string;
  backupPath: string;
  existedBefore: boolean;
  createdAt: string;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function backupFile(workspaceRoot: string, runId: string, relativePath: string): BackupEntry {
  const source = path.join(workspaceRoot, relativePath);
  const existedBefore = fs.existsSync(source);
  const backupDir = path.join(workspaceRoot, ".ck", "backups", runId, path.dirname(relativePath));
  const backupPath = path.join(backupDir, path.basename(relativePath) + ".bak");

  ensureDir(backupDir);

  if (existedBefore) {
    fs.copyFileSync(source, backupPath);
  }

  return {
    originalPath: relativePath,
    backupPath: path.relative(workspaceRoot, backupPath),
    existedBefore,
    createdAt: new Date().toISOString(),
  };
}

export function writeBackupManifest(workspaceRoot: string, runId: string, phase: string, entries: BackupEntry[]): string {
  return writeJsonRecord(workspaceRoot, "backups", runId, `${phase}-backup-manifest.json`, entries);
}
