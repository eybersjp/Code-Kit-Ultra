import { runVerticalSlice } from "./run-vertical-slice";
import { getMemoryByRunId } from "../../memory/src";

export async function resumeRun(runId: string) {
  const memory = getMemoryByRunId(runId);
  if (!memory) throw new Error(`Run ID ${runId} not found in memory.`);
  
  return runVerticalSlice({
    idea: memory.input.idea,
    mode: memory.input.mode,
    currentRun: memory,
  });
}
