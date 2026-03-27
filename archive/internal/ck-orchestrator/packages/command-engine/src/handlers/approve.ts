
import { approveGate } from "../../../core/src/state-store";

export async function handleApprove(command:any, context:any){
  const gate = command.args[0];
  approveGate(context.runId, gate);

  return {
    ok:true,
    message:`Approved ${gate}`
  }
}
