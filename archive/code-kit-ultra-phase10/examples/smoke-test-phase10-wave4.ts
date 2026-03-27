import { executeRunBundle } from "../packages/orchestrator/src/execution-engine.js";
import type { RunBundle } from "../packages/shared/src/types.js";

async function main() {
  console.log("--- Phase 10 Wave 4 Smoke Test (Policy Adaptation) ---");

  const runId = `run-4-${Date.now()}`;
  const mockRunBundle: RunBundle = {
    state: {
      runId,
      status: "planned",
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    },
    plan: {
      tasks: [
        { id: "task-1", title: "Failing Task", adapterId: "mock-adapter", payload: {} }
      ]
    },
    executionLog: { steps: [] },
    adapters: { executions: [], createdAt: new Date().toISOString() },
  };

  try {
    console.log(`[Test] Running bundle ${runId} with 'Failing Task'...`);
    const result = await executeRunBundle(mockRunBundle);
    
    console.log(`[Test] Run status: ${result.state.status}`);
    
    // In our mock logic, 'Failing Task' succeeds if timeout > 30000.
    // The policy engine for 'Failing Task' returns timeout = 60000.
    if (result.state.status === "completed") {
      console.log("Success! Policy adaptation (TIMEOUT_BOOST) verified in execution flow.");
    } else {
      console.log("Failure! Policy adaptation did not result in a completed run.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

main();
