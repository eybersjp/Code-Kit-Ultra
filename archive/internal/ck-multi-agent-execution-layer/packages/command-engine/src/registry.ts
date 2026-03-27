import { handleInit } from "./handlers/init";
import { handleRun } from "./handlers/run";
import { handleApprove } from "./handlers/approve";
import { handleStatus } from "./handlers/status";
import { handleReport } from "./handlers/report";
import { handleAgent } from "./handlers/agent";

export const REGISTRY = {
  init: handleInit,
  run: handleRun,
  approve: handleApprove,
  status: handleStatus,
  report: handleReport,
  agent: handleAgent,
};
