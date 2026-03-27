import fs from "node:fs";
import path from "node:path";
import { attemptHealing } from "../packages/healing/src/healing-engine";
import { loadHealingAttempts, loadHealingStats } from "../packages/healing/src/healing-store";

const runId = `run-${Date.now()}`;
const target = path.resolve(".tmp-phase10_5/test/output.txt");

if (fs.existsSync(path.dirname(target))) {
  fs.rmSync(path.dirname(target), { recursive: true, force: true });
}

async function main() {
  const attempt = await attemptHealing({
    runId,
    stepId: "step-1",
    adapterId: "file-system",
    failureType: "unknown-failure",
    errorMessage: "ENOENT: no such file or directory",
    payload: { path: target },
  });

  const attempts = loadHealingAttempts(runId);
  const stats = loadHealingStats();

  if (attempts.length === 0) throw new Error("Expected healing attempts to be persisted.");
  if (!attempt.selectedStrategyId) throw new Error("Expected a selected healing strategy.");
  if (!["awaiting-approval", "verified"].includes(attempt.status)) {
    throw new Error(`Unexpected healing status: ${attempt.status}`);
  }
  if (attempt.status === "verified" && !fs.existsSync(path.dirname(target))) {
    throw new Error("Expected parent directory to exist after healing.");
  }
  if (attempt.status === "verified" && stats.length === 0) {
    throw new Error("Expected healing stats to be updated.");
  }

  console.log("Phase 10.5 healing test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
