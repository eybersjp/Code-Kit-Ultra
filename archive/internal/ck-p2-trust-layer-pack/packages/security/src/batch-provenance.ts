import crypto from "crypto";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import { writeJsonRecord } from "../../orchestrator/src/log-writer";

export interface BatchProvenance {
  runId: string;
  phase: string;
  generatedBy: string;
  sourceArtifact?: string;
  sourcePhase: string;
  createdAt: string;
  actor?: string;
  batchHash: string;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export function hashBatch(batch: BuilderActionBatch): string {
  return crypto.createHash("sha256").update(stableStringify(batch)).digest("hex");
}

export function createBatchProvenance(params: {
  batch: BuilderActionBatch;
  sourcePhase: string;
  sourceArtifact?: string;
  actor?: string;
}): BatchProvenance {
  return {
    runId: params.batch.runId,
    phase: params.batch.phase,
    generatedBy: params.batch.generatedBy,
    sourceArtifact: params.sourceArtifact,
    sourcePhase: params.sourcePhase,
    createdAt: new Date().toISOString(),
    actor: params.actor,
    batchHash: hashBatch(params.batch),
  };
}

export function writeBatchProvenance(workspaceRoot: string, provenance: BatchProvenance): string {
  return writeJsonRecord(workspaceRoot, "provenance", provenance.runId, `${provenance.phase}-provenance.json`, provenance);
}
