import fs from "fs";

const required = [
  "packages/core/src/run-store.ts",
  "packages/orchestrator/src/execution-coordinator.ts",
  "packages/agents/src/router.ts",
  "packages/command-engine/src/handlers/run.ts"
];

for (const file of required) {
  if (!fs.existsSync(new URL(`../${file}`, import.meta.url))) {
    throw new Error(`Missing expected file: ${file}`);
  }
}

console.log("Smoke test passed.");
