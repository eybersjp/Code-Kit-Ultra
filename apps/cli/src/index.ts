#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { validateEnv } from "../../../packages/shared/src/env-schema";
import { redactSecrets } from "../../../packages/shared/src/redaction";
import { getMetricsSummary } from "../../../packages/observability/src/metrics";
import { recordExecution } from "../../../packages/memory/src/run-store";

function ensureDirs() {
  fs.mkdirSync(".codekit/memory", { recursive: true });
  fs.mkdirSync(".codekit/audit", { recursive: true });
  fs.mkdirSync("artifacts/test-runs", { recursive: true });
  fs.mkdirSync("release", { recursive: true });
}

function validateEnvCommand() {
  const result = validateEnv(process.env);
  if (result.success) {
    console.log("Environment schema: ok");
    return;
  }
  console.log(redactSecrets(JSON.stringify(result.error.issues, null, 2)));
}

const program = new Command();
program.name("code-kit").description("Code Kit Ultra CLI").version("1.0.0-rc2");

program.command("validate-env").action(() => {
  ensureDirs();
  validateEnvCommand();
});

program.command("metrics").action(() => {
  ensureDirs();
  console.log(JSON.stringify(getMetricsSummary(), null, 2));
});

program.command("init")
  .argument("<idea>")
  .option("--dry-run", "dry run", false)
  .action((idea, options) => {
    ensureDirs();
    recordExecution("antigravity-stub", "planning", true);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.resolve(`artifacts/test-runs/${stamp}`);
    fs.mkdirSync(dir, { recursive: true });
    const report = {
      idea,
      dryRun: Boolean(options.dryRun),
      summary: "Phase 9 productionized starter run"
    };
    fs.writeFileSync(path.join(dir, "run-report.json"), JSON.stringify(report, null, 2), "utf-8");
    console.log(chalk.green(`Artifacts: ${dir}`));
  });

program.parse();