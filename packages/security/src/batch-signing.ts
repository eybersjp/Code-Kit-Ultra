import crypto from "crypto";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import type { BatchProvenance } from "./batch-provenance";
import { hashBatch } from "./batch-provenance";
import { writeJsonRecord } from "../../orchestrator/src/log-writer";

export interface SignedBatchEnvelope {
  runId: string;
  phase: string;
  algorithm: "HMAC-SHA256";
  batchHash: string;
  signature: string;
  signedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  provenance: BatchProvenance;
  batch: BuilderActionBatch;
}

function signPayload(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function signBatch(params: {
  batch: BuilderActionBatch;
  provenance: BatchProvenance;
  secret: string;
}): SignedBatchEnvelope {
  const batchHash = hashBatch(params.batch);
  const payload = JSON.stringify({
    runId: params.batch.runId,
    phase: params.batch.phase,
    batchHash,
    provenance: params.provenance,
  });
  const signature = signPayload(params.secret, payload);

  return {
    runId: params.batch.runId,
    phase: params.batch.phase,
    algorithm: "HMAC-SHA256",
    batchHash,
    signature,
    signedAt: new Date().toISOString(),
    provenance: params.provenance,
    batch: params.batch,
  };
}

export function approveSignedBatch(envelope: SignedBatchEnvelope, approvedBy: string): SignedBatchEnvelope {
  return {
    ...envelope,
    approvedBy,
    approvedAt: new Date().toISOString(),
  };
}

export function verifySignedBatch(secret: string, envelope: SignedBatchEnvelope): { valid: boolean; reason: string } {
  const actualHash = hashBatch(envelope.batch);
  if (actualHash !== envelope.batchHash) {
    return { valid: false, reason: "Batch hash mismatch. Batch may have been modified." };
  }

  const payload = JSON.stringify({
    runId: envelope.batch.runId,
    phase: envelope.batch.phase,
    batchHash: envelope.batchHash,
    provenance: envelope.provenance,
  });
  const expectedSignature = signPayload(secret, payload);

  if (expectedSignature !== envelope.signature) {
    return { valid: false, reason: "Signature mismatch. Envelope may have been tampered with." };
  }

  return { valid: true, reason: "Signature and batch hash verified." };
}

export function writeSignedBatch(workspaceRoot: string, envelope: SignedBatchEnvelope): string {
  return writeJsonRecord(workspaceRoot, "signatures", envelope.runId, `${envelope.phase}-signed-batch.json`, envelope);
}
