import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../packages/orchestrator/src/index";

const outputDir = "artifacts/test-runs/smoke-test-phase3";
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
    outputDir
  }
);

if (!report.plan.length) throw new Error("No plan generated");
if (!report.selectedSkills.length) throw new Error("No skills selected");
if (!report.gates.length) throw new Error("No gates generated");
if (!report.adapterExecutions.length) throw new Error("No adapter executions recorded");
if (!report.routeSelections.length) throw new Error("No route selections recorded");
if (!report.paths?.markdownReportPath || !fs.existsSync(report.paths.markdownReportPath)) {
  throw new Error("Markdown report was not generated");
}
if (!report.paths?.jsonReportPath || !fs.existsSync(report.paths.jsonReportPath)) {
  throw new Error("JSON report was not generated");
}

const routingPolicyPath = path.resolve("config/routing-policy.json");
if (!fs.existsSync(routingPolicyPath)) throw new Error("Routing policy config missing");

const generatedReport = await runVerticalSlice(
  {
    idea: "Build a niche compliance copilot for vendor review workflows",
    mode: "balanced",
    skillLevel: "intermediate",
    priority: "quality",
    deliverable: "app"
  },
  {
    dryRun: true,
    outputDir: `${outputDir}-generated`
  }
);

const generatedSkill = generatedReport.selectedSkills.find((skill) => skill.source === "generated");
if (!generatedSkill?.generatedPath || !fs.existsSync(generatedSkill.generatedPath)) {
  throw new Error("Generated SKILL.md package was not written");
}
if (!generatedSkill.manifestPath || !fs.existsSync(generatedSkill.manifestPath)) {
  throw new Error("Generated manifest.json was not written");
}

console.log("Phase 3 smoke test passed");
