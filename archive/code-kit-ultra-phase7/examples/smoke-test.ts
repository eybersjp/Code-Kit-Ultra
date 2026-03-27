import { executeTask } from "../packages/orchestrator/src/execute-task";
import { runVerticalSlice } from "../packages/orchestrator/src/index";
import { getMetricsSummary } from "../packages/observability/src/metrics";

async function main() {
  const dryPlan = await executeTask("planning", { idea: "Build a planning engine" }, true);
  if (!dryPlan.ok) throw new Error("Planning dry-run failed");

  const dryImpl = await executeTask("implementation", { idea: "Implement CRM module" }, true);
  if (!dryImpl.ok) throw new Error("Implementation dry-run failed");

  const report = await runVerticalSlice({
    idea: "Build a planning engine for solar CRM",
    mode: "balanced",
    dryRun: true,
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app"
  });

  if (!report.routes.length) throw new Error("No routes selected");
  if (!(report.execution || []).length) throw new Error("No executions recorded");
  const metrics = getMetricsSummary();
  if (typeof metrics.totalExecutions !== "number") throw new Error("Metrics summary missing");
  console.log("Smoke test passed");
}
main();