import { describe, it, expect } from "vitest";
import { approveSignedBatch, signBatch, verifySignedBatch } from "./batch-signing";
import { createBatchProvenance } from "./batch-provenance";
import type { BuilderActionBatch } from "../../agents/src/action-types";

const secret = "phase3-secret";
const batch: BuilderActionBatch = {
  runId: "run-signing-1",
  phase: "review",
  generatedBy: "audit-agent",
  summary: "Verify batch signing",
  actions: [{ type: "run_command", command: "echo safe" }],
};

describe("Batch Signing", () => {
  const provenance = createBatchProvenance({
    batch,
    sourcePhase: "planning",
    sourceArtifact: "plan-2.json",
    actor: "system",
  });

  it("should sign a batch and verify the envelope", () => {
    const envelope = signBatch({ batch, provenance, secret });
    const result = verifySignedBatch(secret, envelope);

    expect(result.valid).toBe(true);
    expect(result.reason).toContain("verified");
  });

  it("should reject a tampered batch", () => {
    const envelope = signBatch({ batch, provenance, secret });
    const tampered = { ...envelope, batch: { ...envelope.batch, summary: "Tampered" } };
    const result = verifySignedBatch(secret, tampered as any);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Batch hash mismatch");
  });

  it("should mark a signed envelope as approved", () => {
    const envelope = signBatch({ batch, provenance, secret });
    const approved = approveSignedBatch(envelope, "reviewer");

    expect(approved.approvedBy).toBe("reviewer");
    expect(new Date(approved.approvedAt!).getTime()).toBeGreaterThan(0);
  });
});
