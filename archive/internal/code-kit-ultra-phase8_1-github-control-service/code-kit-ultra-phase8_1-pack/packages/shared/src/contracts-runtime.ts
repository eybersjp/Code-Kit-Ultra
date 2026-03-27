import type { PlanTask } from "./types";
import type { PlatformAdapter } from "./contracts";

export function routeTaskToAdapter(task: PlanTask, adapters: PlatformAdapter[]): PlatformAdapter | undefined {
  return adapters.find((adapter) => adapter.canHandle(task.taskType));
}
