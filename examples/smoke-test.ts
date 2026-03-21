import fs from "node:fs";
import { runVerticalSlice } from "../packages/orchestrator/src/index";

const report = await runVerticalSlice(
  {
    idea: "Build a CRM for solar installers with leads, quotes, project tracking, and invoicing",
    mode: "balanced",
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app"
  },
  {
    dryRun: true,
    outputDir: "artifacts/test-runs/smoke-test"
  }
);

if (!report.plan.length) throw new Error("No plan generated");
if (!report.selectedSkills.length) throw new Error("No skills selected");
if (!report.gates.length) throw new Error("No gates generated");
if (!report.adapterExecutions.length) throw new Error("No adapter executions recorded");
if (!report.paths?.markdownReportPath || !fs.existsSync(report.paths.markdownReportPath)) {
  throw new Error("Markdown report was not generated");
}
if (!report.paths?.jsonReportPath || !fs.existsSync(report.paths.jsonReportPath)) {
  throw new Error("JSON report was not generated");
}

console.log("Smoke test passed");
