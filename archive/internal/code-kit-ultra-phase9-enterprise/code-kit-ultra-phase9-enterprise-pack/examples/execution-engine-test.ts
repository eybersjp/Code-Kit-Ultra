import fs from "node:fs";
import path from "node:path";
import { initRun, resumeRun } from "../packages/orchestrator/src/index";

async function main(): Promise<void> {
  const bundle = await initRun({
    idea: "Build an internal tool for project ops with React and Postgres auth roles",
    mode: "balanced",
    skillLevel: "advanced",
    priority: "quality",
    deliverable: "internal-tool",
  });

  if (bundle.state.status !== "paused") {
    throw new Error(`Expected paused run, received ${bundle.state.status}`);
  }

  const resumed = await resumeRun(bundle.state.runId, true);
  if (resumed.state.status !== "completed") {
    throw new Error(`Expected completed run after approval, received ${resumed.state.status}`);
  }

  const generatedRoot = path.resolve(".codekit/generated");
  const hasGeneratedFiles = fs.existsSync(generatedRoot);
  if (!hasGeneratedFiles) {
    throw new Error("Expected generated scaffold folder to exist.");
  }

  console.log(`Execution engine test OK for run ${bundle.state.runId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
