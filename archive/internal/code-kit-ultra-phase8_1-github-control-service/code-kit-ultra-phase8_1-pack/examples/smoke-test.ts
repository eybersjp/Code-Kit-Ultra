import fs from "node:fs";
import path from "node:path";
import { initRun } from "../packages/orchestrator/src/index";

async function main(): Promise<void> {
  const bundle = await initRun({
    idea: "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing",
    mode: "balanced",
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app",
  });

  const dir = path.resolve(".codekit/runs", bundle.state.runId);
  const required = ["intake.json", "plan.json", "gates.json", "adapters.json", "execution-log.json", "state.json", "report.md"];
  for (const file of required) {
    if (!fs.existsSync(path.join(dir, file))) {
      throw new Error(`Missing artifact ${file}`);
    }
  }

  if (!["paused", "completed"].includes(bundle.state.status)) {
    throw new Error(`Unexpected run status ${bundle.state.status}`);
  }

  console.log(`Smoke test OK for run ${bundle.state.runId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
