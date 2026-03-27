#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import {
  inspectRun,
  initRun,
  resumeRun,
  retryStep,
  rollbackStep,
} from "../../../packages/orchestrator/src/index";
import { listRunIds } from "../../../packages/memory/src/run-store";
import { createControlServiceServer } from "../../../packages/control-service/src/server";
import type { Deliverable, Mode, Priority, UserInput } from "../../../packages/shared/src/types";

const program = new Command();
program.name("code-kit").description("Code Kit Ultra CLI").version("0.8.1-phase8.1");

function printRun(bundle: ReturnType<typeof inspectRun> | Awaited<ReturnType<typeof initRun>>): void {
  console.log(chalk.cyan(`\nCode Kit Ultra — Run ${bundle.state.runId}\n`));
  console.log(chalk.green("Idea:"), bundle.intake.idea);
  console.log(chalk.green("Status:"), bundle.state.status);
  console.log(chalk.green("Current Step Index:"), String(bundle.state.currentStepIndex));
  console.log(chalk.green("Approval Required:"), String(bundle.state.approvalRequired));
  if (bundle.state.pauseReason) console.log(chalk.yellow("Pause Reason:"), bundle.state.pauseReason);

  console.log(chalk.yellow("\nGates:"));
  bundle.gates.forEach((g) => console.log(`- ${g.gate}: ${g.status} | pause=${g.shouldPause} | ${g.reason}`));

  console.log(chalk.yellow("\nExecution Summary:"));
  if (bundle.adapters.executions.length === 0) console.log("- None yet");
  bundle.adapters.executions.forEach((e) => console.log(`- ${e.taskId}: ${e.adapter} -> ${e.status} | attempts=${e.attempts}`));

  console.log(chalk.yellow("\nExecution Log:"));
  bundle.executionLog.steps.forEach((s) => console.log(`- ${s.stepId}: ${s.status} | adapter=${s.adapter} | attempt=${s.attempt}`));

  console.log(chalk.green(`\nRun folder: .codekit/runs/${bundle.state.runId}`));
}

program
  .command("init")
  .argument("<idea>", "Project idea")
  .option("-m, --mode <mode>", "safe | balanced | god", "balanced")
  .option("-s, --skill-level <level>", "beginner | intermediate | advanced", "intermediate")
  .option("-p, --priority <priority>", "speed | quality | low-cost | best-ux | scalability | business-ready", "quality")
  .option("-d, --deliverable <deliverable>", "app | automation | website | mvp | internal-tool | agent-system | docs | business-package", "app")
  .option("--allow-command-execution", "Actually run safe local commands instead of dry-run logging", false)
  .action(async (idea, options) => {
    const input: UserInput = {
      idea,
      mode: options.mode as Mode,
      skillLevel: options.skillLevel,
      priority: options.priority as Priority,
      deliverable: options.deliverable as Deliverable,
      allowCommandExecution: Boolean(options.allowCommandExecution),
    };
    const bundle = await initRun(input);
    printRun(bundle);
  });

program
  .command("resume")
  .argument("<runId>", "Run ID")
  .action(async (runId) => {
    const bundle = await resumeRun(runId, false);
    printRun(bundle);
  });

program
  .command("approve")
  .argument("<runId>", "Run ID")
  .action(async (runId) => {
    const bundle = await resumeRun(runId, true);
    printRun(bundle);
  });

program
  .command("retry-step")
  .argument("<runId>", "Run ID")
  .argument("[stepId]", "Optional step ID")
  .action(async (runId, stepId) => {
    const bundle = await retryStep(runId, stepId);
    printRun(bundle);
  });

program
  .command("rollback-step")
  .argument("<runId>", "Run ID")
  .argument("[stepId]", "Optional step ID")
  .action(async (runId, stepId) => {
    const bundle = await rollbackStep(runId, stepId);
    printRun(bundle);
  });

program
  .command("inspect")
  .argument("<runId>", "Run ID")
  .action((runId) => {
    const bundle = inspectRun(runId);
    printRun(bundle);
  });

program.command("list").action(() => {
  console.log(chalk.cyan("\nKnown runs:\n"));
  const ids = listRunIds();
  if (ids.length === 0) console.log("- None");
  ids.forEach((id) => console.log(`- ${id}`));
});

program
  .command("serve")
  .option("-p, --port <port>", "Control service port", "4317")
  .action((options) => {
    const port = Number(options.port);
    const server = createControlServiceServer();
    server.listen(port, () => {
      console.log(chalk.cyan(`Control service listening on http://127.0.0.1:${port}`));
    });
  });

program.parse();
