import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareTrustedBatch } from "./trust-pipeline";
import { verifySignedBatch } from "../../security/src/batch-signing";
import type { BuilderActionBatch } from "../../agents/src/action-types";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cku-trust-pipeline-"));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("Trust Pipeline", () => {
  it("should create diff, provenance, and signed envelope artifacts", () => {
    const batch: BuilderActionBatch = {
      runId: "run-trust-1",
      phase: "build",
      generatedBy: "trust-agent",
      summary: "Create trusted artifacts",
      actions: [{ type: "write_file", path: "secure.txt", content: "trusted\n" }],
    };

    const secret = "phase3-secret";
    const result = prepareTrustedBatch({
      workspaceRoot,
      batch,
      sourcePhase: "planning",
      sourceArtifact: "plan-3.json",
      actor: "system",
      signingSecret: secret,
    });

    expect(fs.existsSync(result.diffArtifactPath)).toBe(true);
    expect(fs.existsSync(result.provenancePath)).toBe(true);
    expect(fs.existsSync(result.signaturePath)).toBe(true);
    expect(result.envelope.runId).toBe(batch.runId);

    const verification = verifySignedBatch(secret, result.envelope);
    expect(verification.valid).toBe(true);
  });
});
