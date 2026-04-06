import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signBatch } from "../../../security/src/batch-signing";
import { handleVerifyBatch } from "./verify-batch";
import { createBatchProvenance } from "../../../security/src/batch-provenance";
import type { BuilderActionBatch } from "../../../agents/src/action-types";

const batch: BuilderActionBatch = {
  runId: "run-verify-1",
  phase: "build",
  generatedBy: "verify-agent",
  summary: "Verify signed envelope",
  actions: [{ type: "run_command", command: "echo verify" }],
};

let originalSecret: string | undefined;

beforeEach(() => {
  originalSecret = process.env.CK_SIGNING_SECRET;
  process.env.CK_SIGNING_SECRET = "verify-secret";
});

afterEach(() => {
  if (originalSecret !== undefined) {
    process.env.CK_SIGNING_SECRET = originalSecret;
  } else {
    delete process.env.CK_SIGNING_SECRET;
  }
});

describe("Verify Batch Command Handler", () => {
  it("should return an error when CK_SIGNING_SECRET is missing", async () => {
    delete process.env.CK_SIGNING_SECRET;
    const response = await handleVerifyBatch({ text: "{}" }, {} as any);
    expect(response.ok).toBe(false);
    expect(response.message).toContain("CK_SIGNING_SECRET is required");
  });

  it("should return usage guidance for invalid JSON", async () => {
    const response = await handleVerifyBatch({ text: "not-json" }, {} as any);
    expect(response.ok).toBe(false);
    expect(response.message).toContain("Usage");
  });

  it("should validate a signed batch envelope", async () => {
    const provenance = createBatchProvenance({
      batch,
      sourcePhase: "planning",
      sourceArtifact: "plan-verify.json",
      actor: "system",
    });
    const envelope = signBatch({ batch, provenance, secret: "verify-secret" });

    const response = await handleVerifyBatch({ text: JSON.stringify(envelope) }, {} as any);
    const responseData = response.data as { valid: boolean };

    expect(response.ok).toBe(true);
    expect(responseData.valid).toBe(true);
    expect(response.message).toContain("verified");
  });
});
