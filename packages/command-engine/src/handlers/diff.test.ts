import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleDiff } from "./diff";
import type { BuilderActionBatch } from "../../../agents/src/action-types";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cku-handler-diff-"));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("Diff Command Handler", () => {
  it("should return an error when workspaceRoot is missing", async () => {
    const response = await handleDiff({ text: "{}" }, {} as any);
    expect(response.ok).toBe(false);
    expect(response.message).toContain("workspaceRoot is required");
  });

  it("should return usage guidance for invalid JSON", async () => {
    const response = await handleDiff({ text: "not-json" }, { workspaceRoot } as any);
    expect(response.ok).toBe(false);
    expect(response.message).toContain("Usage");
  });

  it("should generate a diff preview from a valid batch", async () => {
    const batch: BuilderActionBatch = {
      runId: "run-cmd-diff-1",
      phase: "build",
      generatedBy: "handler-agent",
      summary: "Preview a safe write",
      actions: [{ type: "write_file", path: "notes.txt", content: "hello\n" }],
    };

    const response = await handleDiff({ text: JSON.stringify(batch) }, { workspaceRoot } as any);
    const responseData = response.data as { markdown: string };

    expect(response.ok).toBe(true);
    expect(responseData.markdown).toContain("run-cmd-diff-1");
    expect(response.message).toContain("Diff preview generated");
  });
});
