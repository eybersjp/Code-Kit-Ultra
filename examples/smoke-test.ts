import fs from "node:fs";
import path from "node:path";
import { executeTask } from "../packages/orchestrator/src/execute-task";
import { runVerticalSlice } from "../packages/orchestrator/src/index";

async function main() {
  const dry = await executeTask("planning", { idea: "Build a planning engine" }, true);
  if (!dry.ok) throw new Error("Dry-run execution failed");

  const real = await executeTask("planning", { idea: "Build a planning engine" }, false);
  if (!real.ok) {
    // allowed only if real adapter credentials absent and a stub fallback is used by routing
    if (real.mode !== "stub") throw new Error("Expected stub fallback or successful real execution");
  }

  const report = await runVerticalSlice({
    idea: "Quantum Weather Engine for orbital climate prediction",
    mode: "balanced",
    dryRun: true,
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app"
  });

  if (!report.routes.length) throw new Error("No routes selected");
  if (!(report.execution || []).length) throw new Error("No execution recorded");

  const generated = report.selectedSkills.find((s) => s.source === "generated");
  if (!generated?.generatedPath) throw new Error("Expected generated skill path");
  if (!fs.existsSync(path.join(generated.generatedPath, "manifest.json"))) throw new Error("Generated manifest missing");

  console.log("Smoke test passed");
}

main();