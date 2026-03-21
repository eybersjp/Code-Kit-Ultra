import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../packages/orchestrator/src/index";
import { adapterHealthReport } from "../packages/adapters/src/router";

async function main() {
  const report = await runVerticalSlice({
    idea: "Quantum Weather Engine for orbital climate prediction",
    mode: "balanced",
    dryRun: true,
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app"
  });

  if (!report.plan.length) throw new Error("No plan generated");
  if (!report.selectedSkills.length) throw new Error("No skills selected");
  if (!report.routes.length) throw new Error("No routes selected");
  if (!report.gates.length) throw new Error("No gates generated");

  const generated = report.selectedSkills.find((s) => s.source === "generated");
  if (!generated?.generatedPath) throw new Error("Expected generated skill path");
  if (!fs.existsSync(path.join(generated.generatedPath, "manifest.json"))) throw new Error("Generated manifest missing");

  const adapters = await adapterHealthReport();
  if (!adapters.length) throw new Error("No adapters in health report");

  console.log("Smoke test passed");
}

main();