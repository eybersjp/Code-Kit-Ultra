import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runActionBatch } from "./action-runner";
import type { BuilderActionBatch } from "../../agents/src/action-types";
import type { Mode } from "../../shared/src";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cku-action-runner-"));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("Action Runner Parallel Execution", () => {
  it("should execute actions across agent groups in parallel when enabled", async () => {
    const batch: BuilderActionBatch = {
      runId: "run-parallel-1",
      phase: "build",
      generatedBy: "parallel-agent",
      summary: "Execute parallel groups",
      actions: [
        { type: "write_file", path: "group-a.txt", content: "A\n" },
        { type: "write_file", path: "group-b.txt", content: "B\n" },
      ],
    };

    const result = await runActionBatch({
      workspaceRoot,
      mode: "expert" as Mode,
      batch,
      parallel: true,
      dryRun: false,
    });

    expect(result.summary).toContain("Parallel action batch executed across 2 agent groups");
    expect(result.results).toHaveLength(2);
    expect(fs.existsSync(path.join(workspaceRoot, ".ck", "artifacts", batch.runId, `${batch.phase}-actions.md`))).toBe(true);
    expect(fs.readFileSync(path.join(workspaceRoot, "group-a.txt"), "utf-8")).toBe("A\n");
    expect(fs.readFileSync(path.join(workspaceRoot, "group-b.txt"), "utf-8")).toBe("B\n");
  });

  it("should fallback to sequential execution when no agent groups are defined", async () => {
    const batch: BuilderActionBatch = {
      runId: "run-parallel-2",
      phase: "build",
      generatedBy: "parallel-agent",
      summary: "Execute single group",
      actions: [{ type: "write_file", path: "single.txt", content: "single\n" }],
    };

    const result = await runActionBatch({
      workspaceRoot,
      mode: "expert" as Mode,
      batch,
      parallel: true,
      dryRun: false,
    });

    expect(result.summary).toBe("Action batch executed successfully.");
    expect(result.results).toHaveLength(1);
    expect(fs.existsSync(path.join(workspaceRoot, "single.txt"))).toBe(true);
  });
});
