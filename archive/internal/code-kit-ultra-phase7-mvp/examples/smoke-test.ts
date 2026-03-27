import { runVerticalSlice } from "../packages/orchestrator/src/index";

const report = await runVerticalSlice({
  idea: "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing",
  mode: "balanced",
  skillLevel: "intermediate",
  priority: "quality",
  deliverable: "app",
});

if (!report.plan.length) throw new Error("No plan generated");
if (!report.selectedSkills.length) throw new Error("No skills selected");
if (!report.gates.length) throw new Error("No gates generated");
if (!report.adapterExecutions.length) throw new Error("No mock executions generated");

console.log("Smoke test passed");
