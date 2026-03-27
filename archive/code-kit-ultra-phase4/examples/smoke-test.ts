import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../packages/orchestrator/src/index";
import { checkAllAdapters } from "../packages/adapters/src/health";
import { approveGeneratedSkill, promoteGeneratedSkill } from "../packages/skill-engine/src/promotion";

async function main(): Promise<void> {
  const report = await runVerticalSlice({
    idea: "Quantum Weather Engine for orbital climate prediction",
    mode: "balanced",
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app",
  }, {
    dryRun: true,
    outputDir: "artifacts/test-runs/smoke-phase4",
  });

  if (!report.plan.length) throw new Error("No plan generated");
  if (!report.selectedSkills.length) throw new Error("No skills selected");
  if (!report.gates.length) throw new Error("No gates generated");

  const generated = report.selectedSkills.find((s) => s.source === "generated");
  if (!generated?.manifestPath) throw new Error("Expected generated skill manifest");
  if (!fs.existsSync(generated.manifestPath)) throw new Error("Generated skill manifest missing on disk");

  const health = await checkAllAdapters();
  if (!health.length) throw new Error("No adapters found");
  if (!health.every((item) => item.configured)) throw new Error("Adapter configuration invalid");

  approveGeneratedSkill(generated.skillId, "Smoke test approval");
  const promoted = promoteGeneratedSkill(generated.skillId);
  if (!fs.existsSync(promoted.promotedManifestPath)) throw new Error("Promoted manifest missing");

  const installedDir = path.dirname(promoted.promotedManifestPath);
  if (!fs.existsSync(installedDir)) throw new Error("Installed skill directory missing");

  console.log("Phase 4 smoke test passed");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
