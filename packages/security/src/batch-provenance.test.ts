import { describe, it, expect } from "vitest";
import { createBatchProvenance, hashBatch } from "./batch-provenance";
import type { BuilderActionBatch } from "../../agents/src/action-types";

const batch: BuilderActionBatch = {
  runId: "run-provenance-1",
  phase: "build",
  generatedBy: "trusted-agent",
  summary: "Provenance check",
  actions: [{ type: "write_file", path: "foo.txt", content: "test\n" }],
};

describe("Batch Provenance", () => {
  it("should produce a stable batch hash and provenance metadata", () => {
    const firstHash = hashBatch(batch);
    const secondHash = hashBatch(batch);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toMatch(/^[0-9a-f]{64}$/);

    const provenance = createBatchProvenance({
      batch,
      sourcePhase: "planning",
      sourceArtifact: "plan-1.json",
      actor: "system",
    });

    expect(provenance.runId).toBe(batch.runId);
    expect(provenance.phase).toBe(batch.phase);
    expect(provenance.generatedBy).toBe(batch.generatedBy);
    expect(provenance.batchHash).toBe(firstHash);
    expect(new Date(provenance.createdAt).getTime()).toBeGreaterThan(0);
  });
});
