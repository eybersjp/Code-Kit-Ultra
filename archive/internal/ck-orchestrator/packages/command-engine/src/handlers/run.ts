
import { runOrchestrator } from "../../../orchestrator/src/index";

export async function handleRun(command:any, context:any){
  const result = runOrchestrator(context.runId);

  return {
    ok:true,
    message:"Run executed",
    data:result
  }
}
