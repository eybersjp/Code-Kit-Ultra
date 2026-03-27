import { executeRunBundle } from "../packages/orchestrator/src/execution-engine.js";
import type { RunBundle } from "../packages/shared/src/types.js";
import { OutcomeCapturer } from "../packages/outcomes/src/index.js";

async function main() {
  console.log("--- Phase 10 Wave 2 Smoke Test (Failure Learning) ---");

  const mockRunBundle: RunBundle = {
    state: {
      runId: `run-fail-${Date.now()}`,
      status: "planned",
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    },
    plan: {
      tasks: [
        { id: "task-fail", title: "Failing Task", adapterId: "mock-adapter", payload: {} }
      ]
    },
    executionLog: { steps: [] },
    adapters: { executions: [], createdAt: new Date().toISOString() },
  };

  try {
    // Manually record a failure outcome to trigger learning
    const outcome = OutcomeCapturer.normalize({
      runId: mockRunBundle.state.runId,
      success: false,
      retryCount: 3,
      timeTakenMs: 5000,
      qualityScore: 0,
      adaptersUsed: ["mock-adapter"],
      failureType: "TIMEOUT_ERROR",
      notes: "Executiontimed out after 3 retries",
    });

    await OutcomeCapturer.record(outcome);
    console.log("Success! Failure outcome recorded and learning triggered.");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

main();
