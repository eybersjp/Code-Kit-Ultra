import { executeRun } from "./execution-coordinator";

export async function resumeRun(runId: string) {
  return executeRun(runId);
}
