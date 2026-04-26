import fs from "fs";
import path from "path";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import { generateBatchId } from "../../shared/src/id-generator";

export type QueueStatus = "pending" | "approved" | "executed" | "blocked";

export interface QueuedBatch {
  id: string;
  runId: string;
  phase: string;
  createdAt: string;
  status: QueueStatus;
  riskSummary: {
    low: number;
    medium: number;
    high: number;
  };
  generatedBy: string;
  summary: string;
  batch: BuilderActionBatch;
}

function queueDir(workspaceRoot: string) {
  return path.join(workspaceRoot, ".ck", "queue");
}

function queueFile(workspaceRoot: string, id: string) {
  return path.join(queueDir(workspaceRoot), `${id}.json`);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function randomId() {
  return generateBatchId();
}

export function createQueuedBatch(params: {
  workspaceRoot: string;
  runId: string;
  phase: string;
  riskSummary: { low: number; medium: number; high: number };
  generatedBy: string;
  summary: string;
  batch: BuilderActionBatch;
}): QueuedBatch {
  ensureDir(queueDir(params.workspaceRoot));
  const queued: QueuedBatch = {
    id: randomId(),
    runId: params.runId,
    phase: params.phase,
    createdAt: new Date().toISOString(),
    status: "pending",
    riskSummary: params.riskSummary,
    generatedBy: params.generatedBy,
    summary: params.summary,
    batch: params.batch,
  };
  fs.writeFileSync(queueFile(params.workspaceRoot, queued.id), JSON.stringify(queued, null, 2), "utf-8");
  return queued;
}

export function getQueuedBatch(workspaceRoot: string, id: string): QueuedBatch {
  const raw = fs.readFileSync(queueFile(workspaceRoot, id), "utf-8");
  return JSON.parse(raw);
}

export function updateQueuedBatchStatus(workspaceRoot: string, id: string, status: QueueStatus): QueuedBatch {
  const batch = getQueuedBatch(workspaceRoot, id);
  batch.status = status;
  fs.writeFileSync(queueFile(workspaceRoot, id), JSON.stringify(batch, null, 2), "utf-8");
  return batch;
}

export function listQueuedBatches(workspaceRoot: string, runId?: string): QueuedBatch[] {
  const dir = queueDir(workspaceRoot);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as QueuedBatch)
    .filter((b) => !runId || b.runId == runId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
