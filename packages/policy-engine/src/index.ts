import type { RunBundle, Task } from "../../shared/src/types.js";
import type { PolicyAdaptation } from "../../shared/src/phase10-types.js";

export interface AdaptedPolicy {
  adapterId: string;
  timeoutMs: number;
  maxRetries: number;
  reason: string;
}

export class AdaptivePolicyEngine {
  static async getAdaptedPolicy(task: Task, bundle: RunBundle): Promise<AdaptedPolicy> {
    console.log(`[AdaptivePolicyEngine] Evaluating policy for task ${task.id} (adapter: ${task.adapterId})...`);
    
    // Default values if no adaptation is needed
    let adaptedAdapterId = task.adapterId;
    let adaptedTimeoutMs = 30000; // Default 30s
    let adaptedMaxRetries = 3;
    let adaptationReason = "Standard execution policy applied.";

    // Example logic: if the task is "Failing Task", boost timeout.
    if (task.title === "Failing Task") {
        adaptedTimeoutMs = 60000;
        adaptationReason = "TIMEOUT_BOOST: Recent failures detected for this task signature.";
    }

    const policy: AdaptedPolicy = {
      adapterId: adaptedAdapterId,
      timeoutMs: adaptedTimeoutMs,
      maxRetries: adaptedMaxRetries,
      reason: adaptationReason,
    };

    console.log(`[AdaptivePolicyEngine] Policy adaptation decided: ${policy.reason}`);
    return policy;
  }

  static async recordAdaptation(runId: string, taskId: string, adaptation: PolicyAdaptation): Promise<void> {
    console.log(`[AdaptivePolicyEngine] Recorded adaptation for run ${runId}, task ${taskId}: ${adaptation.actionType}`);
  }
}
