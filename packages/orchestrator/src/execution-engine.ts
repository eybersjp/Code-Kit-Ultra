import { OutcomeCapturer } from "../../outcomes/src/index.js";
import { AdaptivePolicyEngine } from "../../policy-engine/src/index.js";
import { PlanOptimizer } from "../../optimizer/src/index.js";
import type { RunBundle } from "../../shared/src/types.js";

export async function executeRunBundle(bundle: RunBundle): Promise<RunBundle> {
  console.log(`[Orchestrator] Starting run: ${bundle.state.runId}`);
  
  // Wave 5: Pre-execution optimization
  const { optimizedBundle, changes } = await PlanOptimizer.optimize(bundle);
  bundle = optimizedBundle;

  for (const task of bundle.plan.tasks) {
    console.log(`[Orchestrator] Executing task ${task.id}: ${task.title}`);

    // Wave 4: Get adapted policy
    const policy = await AdaptivePolicyEngine.getAdaptedPolicy(task, bundle);
    console.log(`[Orchestrator] Applying policy: Timeout=${policy.timeoutMs}ms, MaxRetries=${policy.maxRetries}, Adapter=${policy.adapterId}`);

    // Mock execution simulation
    const success = task.title !== "Failing Task" || policy.timeoutMs > 30000;

    const metrics = {
      timeTakenMs: 1200,
      retryCount: 0,
      qualityScore: success ? 1 : 0,
      adaptersUsed: [policy.adapterId],
    };

    const outcome = OutcomeCapturer.normalize({
      runId: bundle.state.runId,
      success,
      ...metrics,
      failureType: success ? undefined : "TIMEOUT_ERROR",
    });

    await OutcomeCapturer.record(outcome);
  }

  bundle.state.status = "completed";
  bundle.state.updatedAt = new Date().toISOString();

  return bundle;
}
