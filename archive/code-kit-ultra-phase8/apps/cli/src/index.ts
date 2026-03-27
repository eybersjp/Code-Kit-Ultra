#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";

function ensureDirs() {
  fs.mkdirSync(".codekit/memory", { recursive: true });
  fs.mkdirSync(".codekit/audit", { recursive: true });
  fs.mkdirSync("artifacts/test-runs", { recursive: true });
}

function validateEnv() {
  const required = ["ANTIGRAVITY_API_KEY", "ANTIGRAVITY_BASE_URL", "CURSOR_API_KEY", "CURSOR_BASE_URL", "WINDSURF_API_KEY", "WINDSURF_BASE_URL"];
  return required.map((key) => ({ key, ok: Boolean(process.env[key]) }));
}

function metrics() {
  const file = path.resolve(".codekit/memory/project-memory.json");
  if (!fs.existsSync(file)) {
    return { totalExecutions: 0, successRate: 0, topAdapters: [] };
  }
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const executions = data.executionHistory || [];
  const successCount = executions.filter((x: any) => x.ok).length;
  const counts = Object.entries(data.adapterSuccessCounts || {}).map(([name, count]) => ({ name, count }));
  return { totalExecutions: executions.length, successRate: executions.length ? successCount / executions.length : 0, topAdapters: counts };
}

function adapters() {
  return [
    { name: "antigravity-real", ok: Boolean(process.env.ANTIGRAVITY_API_KEY && process.env.ANTIGRAVITY_BASE_URL) },
    { name: "cursor-real", ok: Boolean(process.env.CURSOR_API_KEY && process.env.CURSOR_BASE_URL) },
    { name: "windsurf-real", ok: Boolean(process.env.WINDSURF_API_KEY && process.env.WINDSURF_BASE_URL) },
    { name: "antigravity-stub", ok: true },
    { name: "cursor-stub", ok: true },
    { name: "windsurf-stub", ok: true }
  ];
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
program.name("code-kit").description("Code Kit Ultra CLI").version("1.0.0-rc1");

program.command("validate-env").action(() => {
  ensureDirs();
  const results = validateEnv();
  results.forEach((r) => console.log(`${r.key}: ${r.ok ? "ok" : "missing"}`));
});

program.command("adapters").action(() => {
  ensureDirs();
  adapters().forEach((a) => console.log(`${a.name}: ${a.ok ? "healthy" : "missing-config"}`));
});

program.command("metrics").action(() => {
  ensureDirs();
  console.log(JSON.stringify(metrics(), null, 2));
});

program.command("execute")
  .argument("<taskType>")
  .requiredOption("--payload <json>")
  .option("--dry-run", "dry run", false)
  .action((taskType, options) => {
    ensureDirs();
    const payload = JSON.parse(options.payload);
    const adapter = taskType === "implementation" ? "cursor-stub" : "antigravity-stub";
    recordExecution(adapter, taskType, true);
    console.log(JSON.stringify({
      ok: true,
      taskType,
      adapter,
      dryRun: Boolean(options.dryRun),
      output: { summary: `Executed ${taskType}`, payload }
    }, null, 2));
  });

program.command("init")
  .argument("<idea>")
  .option("--dry-run", "dry run", false)
  .action((idea, options) => {
    ensureDirs();
    const adapter = "antigravity-stub";
    recordExecution(adapter, "planning", true);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.resolve(`artifacts/test-runs/${stamp}`);
    fs.mkdirSync(dir, { recursive: true });
    const report = {
      idea,
      dryRun: Boolean(options.dryRun),
      summary: "Phase 8 productized starter run",
      routes: [
        { taskType: "planning", adapter: "antigravity-stub" },
        { taskType: "implementation", adapter: "cursor-stub" }
      ]
    };
    fs.writeFileSync(path.join(dir, "run-report.json"), JSON.stringify(report, null, 2), "utf-8");
    fs.writeFileSync(path.join(dir, "report.md"), `# Run Report\n\nIdea: ${idea}\n`, "utf-8");
    console.log(chalk.green(`Artifacts: ${dir}`));
  });

program.parse();