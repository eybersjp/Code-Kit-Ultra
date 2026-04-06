import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDiffPreview, writeDiffPreview } from "./diff-preview";
import type { BuilderActionBatch } from "../../agents/src/action-types";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cku-diff-preview-"));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("Diff Preview", () => {
  it("should generate a structured diff preview for a batch", () => {
    const filePath = path.join(workspaceRoot, "README.md");
    fs.writeFileSync(filePath, "Hello\n", "utf-8");

    const batch: BuilderActionBatch = {
      runId: "run-diff-1",
      phase: "build",
      generatedBy: "test-agent",
      summary: "Update README and run a check",
      actions: [
        { type: "write_file", path: "README.md", content: "Hello\nWorld\n" },
        { type: "run_command", command: "npm test", cwd: "." },
      ],
    };

    const preview = buildDiffPreview(workspaceRoot, batch);

    expect(preview.markdown).toContain("# BUILD Diff Preview");
    expect(preview.markdown).toContain("+ World");
    expect(preview.items).toHaveLength(2);
    expect(preview.items[0].allowed).toBe(true);
    expect(preview.items[1].actionType).toBe("run_command");
  });

  it("should write the diff preview to an artifact file", () => {
    const batch: BuilderActionBatch = {
      runId: "run-diff-2",
      phase: "build",
      generatedBy: "test-agent",
      summary: "Create a new file",
      actions: [{ type: "write_file", path: "notes.txt", content: "A note\n" }],
    };

    const result = writeDiffPreview(workspaceRoot, batch);

    expect(fs.existsSync(result.artifactPath)).toBe(true);
    const written = fs.readFileSync(result.artifactPath, "utf-8");
    expect(written).toContain("notes.txt");
    expect(written).toContain("A note");
  });
});
