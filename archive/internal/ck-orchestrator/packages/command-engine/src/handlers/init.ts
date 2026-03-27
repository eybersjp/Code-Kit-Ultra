
import { createRun } from "../../../core/src/state-store";
import { v4 as uuidv4 } from "uuid";

export async function handleInit(command:any, context:any){
  const id = uuidv4();
  const run = createRun(id, context.mode, { idea: command.text });

  return {
    ok:true,
    message:"Run created",
    data:{ runId: id, run }
  }
}
