import { executeRunBundle } from "../packages/orchestrator/src/execution-engine.js";
import type { RunBundle } from "../packages/shared/src/types.js";

async function main() {
  console.log("--- Phase 10 Wave 5 Smoke Test (Plan Optimization) ---");

  const runId = `run-5-${Date.now()}`;
  const mockRunBundle: RunBundle = {
    state: {
      runId,
      status: "planned",
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    },
    plan: {
      tasks: [
        { id: "task-1", title: "Legacy Task", adapterId: "trash-adapter", payload: {} }
      ]
    },
    executionLog: { steps: [] },
    adapters: { executions: [], createdAt: new Date().toISOString() },
  };

  try {
    console.log(`[Test] Running bundle ${runId} with 'trash-adapter'...`);
    const result = await executeRunBundle(mockRunBundle);
    
    console.log(`[Test] Final run status: ${result.state.status}`);
    
    // Check if the adapter was swapped
    const usedAdapter = result.plan.tasks[0].adapterId;
    console.log(`[Test] Adapter used for task-1: ${usedAdapter}`);

    if (usedAdapter === "premium-llm-v1") {
      console.log("Success! Plan optimization (ADAPTER_SWAP) verified in pre-execution flow.");
    } else {
      console.log("Failure! Plan was not optimized.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

main();
