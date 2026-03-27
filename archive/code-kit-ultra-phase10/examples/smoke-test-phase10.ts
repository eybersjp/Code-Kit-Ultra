import { executeRunBundle } from "../packages/orchestrator/src/execution-engine.js";
import type { RunBundle } from "../packages/shared/src/types.js";

async function main() {
  console.log("--- Phase 10 Wave 1 Smoke Test ---");

  const mockRunBundle: RunBundle = {
    state: {
      runId: `run-${Date.now()}`,
      status: "planned",
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    },
    plan: {
      tasks: [
        { id: "task-1", title: "Test Task", adapterId: "mock-adapter", payload: {} }
      ]
    },
    executionLog: { steps: [] },
    adapters: { executions: [], createdAt: new Date().toISOString() },
  };

  try {
    const result = await executeRunBundle(mockRunBundle);
    console.log(`Run status: ${result.state.status}`);
    console.log("Success! Outcome ingestion verified (mock).");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

main();
