import type { ExecutionScope } from "../../shared/src/types";
import type { HealingAttempt } from "../../shared/src/phase10_5-types";
import { attemptHealing } from "../../healing/src/healing-engine";

export interface FailedStepContext {
  runId: string;
  stepId: string;
  adapterId: string;
  errorMessage: string;
  payload?: Record<string, unknown>;
  workingDirectory?: string;
  scope?: ExecutionScope;
}

export async function healFailedStep(context: FailedStepContext): Promise<HealingAttempt> {
  return attemptHealing({
    runId: context.runId,
    stepId: context.stepId,
    adapterId: context.adapterId,
    failureType: "unknown-failure",
    errorMessage: context.errorMessage,
    payload: context.payload,
    workingDirectory: context.workingDirectory,
    scope: context.scope,
  } as any);
}
