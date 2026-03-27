#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";

function ensureDirs() {
  fs.mkdirSync(".codekit/memory", { recursive: true });
  fs.mkdirSync(".codekit/audit", { recursive: true });
  fs.mkdirSync("artifacts/test-runs", { recursive: true });
  fs.mkdirSync("release", { recursive: true });
}

function metrics() {
  const file = path.resolve(".codekit/memory/project-memory.json");
  if (!fs.existsSync(file)) return { totalExecutions: 0, successRate: 0, topAdapters: [] };
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const executions = data.executionHistory || [];
  const successCount = executions.filter((x: any) => x.ok).length;
  const counts = Object.entries(data.adapterSuccessCounts || {}).map(([name, count]) => ({ name, count }));
  return { totalExecutions: executions.length, successRate: executions.length ? successCount / executions.length : 0, topAdapters: counts };
}

function recordExecution(adapter: string, taskType: string, ok: boolean) {
  const file = path.resolve(".codekit/memory/project-memory.json");
  const seed = { executionHistory: [], adapterSuccessCounts: {} as Record<string, number> };
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : seed;
  data.executionHistory.push({ adapter, taskType, ok, at: new Date().toISOString() });
  if (ok) data.adapterSuccessCounts[adapter] = (data.adapterSuccessCounts[adapter] || 0) + 1;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

const program = new Command();
program.name("code-kit").description("Code Kit Ultra CLI").version("1.0.0");

program.command("validate-env").action(() => {
  ensureDirs();
  console.log("Environment validation entry point ready.");
});

program.command("metrics").action(() => {
  ensureDirs();
  console.log(JSON.stringify(metrics(), null, 2));
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
    const report = { idea, dryRun: Boolean(options.dryRun), summary: "Phase 10 public release starter run" };
    fs.writeFileSync(path.join(dir, "run-report.json"), JSON.stringify(report, null, 2), "utf-8");
    console.log(chalk.green(`Artifacts: ${dir}`));
  });

program.parse();