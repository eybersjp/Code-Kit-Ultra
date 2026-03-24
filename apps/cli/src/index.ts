#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { loadProjectMemory } from "../../../packages/memory/src";
import { runVerticalSlice } from "../../../packages/orchestrator/src";
import { getModePolicy } from "../../../packages/orchestrator/src/mode-controller";
import type { GateDecision, Mode, SelectedSkill, Task } from "../../../packages/shared/src";
import { saveProjectMemory } from "../../../packages/memory/src";

function normalizeMode(input: string | undefined): Mode {
  const mode = input?.toLowerCase();
  if (mode === "turbo" || mode === "builder" || mode === "pro" || mode === "expert") {
    return mode;
  }
  return "builder";
}

function printSection(title: string): void {
  console.log(chalk.yellow(`\n${title}`));
}

function printPlan(plan: Task[]): void {
  printSection("Plan:");
  if (!plan.length) {
    console.log("- None");
    return;
  }

  for (const task of plan) {
    const dependencySuffix = task.dependencies.length
      ? ` [deps: ${task.dependencies.join(", ")}]`
      : "";
    console.log(`- ${task.id}: ${task.title}${dependencySuffix}`);
  }
}

function printSkills(skills: SelectedSkill[]): void {
  printSection("Selected Skills:");
  if (!skills.length) {
    console.log("- None");
    return;
  }

  for (const skill of skills) {
    const reason = typeof skill.reason === "string" ? ` — ${skill.reason}` : "";
    const score = typeof skill.score === "number" ? ` (score=${skill.score})` : "";
    console.log(`- ${skill.skillId ?? skill.name}${score}${reason}`);
  }
}

function printGates(gates: GateDecision[], approvedGates: string[] = []): void {
  printSection("Gates:");
  if (!gates.length) {
    console.log("- None");
    return;
  }

  for (const gate of gates) {
    const isApproved = approvedGates.includes(gate.gate);
    const statusColor = gate.status === "pass" ? chalk.green : gate.status === "blocked" ? chalk.red : chalk.yellow;
    const approvalSuffix = isApproved ? chalk.blue(" (APPROVED)") : "";
    console.log(`- ${chalk.bold(gate.gate)}: ${statusColor(gate.status)}${approvalSuffix} | ${gate.reason}`);
    
    if (gate.explanation && (gate.status === "blocked" || gate.status === "needs-review")) {
      console.log(chalk.dim(`  Impact: ${gate.explanation.impact}`));
      console.log(chalk.dim(`  Fix: ${gate.explanation.fix}`));
    }
  }
}

function printModeSet(mode: Mode): void {
  const normalized = normalizeMode(mode);
  const policy = getModePolicy(normalized);
  console.log(chalk.bold.magenta(`\nCODE KIT ULTRA MODE SET: ${normalized.toUpperCase()}`));
  console.log(`\nExecution Style:\n${policy.description}`);

  const behaviors = {
    turbo: { AI: "Full", User: "Minimal", Pipeline: "AUTO" },
    builder: { AI: "High", User: "Low", Pipeline: "AUTO/MINIMAL APPROVALS" },
    pro: { AI: "Balanced", User: "Moderate", Pipeline: "CHECKPOINTS" },
    expert: { AI: "Minimal", User: "Full", Pipeline: "MANUAL" }
  }[normalized];

  console.log(`\nAI Control:\n${behaviors.AI}`);
  console.log(`\nUser Control:\n${behaviors.User}`);
  console.log(`\nPipeline Behavior:\n${behaviors.Pipeline}`);

  console.log(`\nRecommended Flow:`);
  console.log(`1. /ck-init <idea>`);
  console.log(`2. /ck-run`);
  console.log(`3. /ck-report\n`);
}

const program = new Command();

program
  .name("code-kit")
  .description("Code Kit Ultra CLI")
  .version("1.1.1-trust");

async function executePipeline(idea: string | undefined, options: { mode?: Mode; approvedGates?: string[]; stage?: string }) {
  const memory = loadProjectMemory();
  const targetIdea = idea || memory.lastIdea;

  if (!targetIdea) {
    console.error(chalk.red("Error: No idea provided and no previous idea found. Run /ck-init <idea> first."));
    return;
  }

  const mode = options.mode || normalizeMode(memory.runs[0]?.mode);
  const approvedGates = options.approvedGates || memory.runs[0]?.approvedGates || [];

  const result = await runVerticalSlice({
    idea: targetIdea,
    mode,
    approvedGates,
  });

  const report = result.report;

  console.log(chalk.cyan(`\nCode Kit Ultra — ${options.stage ? options.stage.toUpperCase() : "Pipeline Execution"}\n`));
  console.log(chalk.green("Mode:"), mode.toUpperCase());
  console.log(chalk.green("Phase:"), report.currentPhase.toUpperCase());
  
  if (options.stage) {
    console.log(chalk.green("Target Stage:"), options.stage);
  }

  console.log(chalk.green("Overall status:"), report.overallGateStatus);

  if (report.gates && report.gates.length > 0) {
    printGates(report.gates, report.approvedGates);
  }

  if (report.overallGateStatus === "blocked" || report.overallGateStatus === "needs-review") {
    console.log(chalk.yellow("\nPipeline paused due to gates."));
    console.log("Use /ck-approve <gate> to unblock.");
    
    // In Expert mode, we explicitly show the next command
    if (mode === "expert") {
      const nextGate = report.gates.find(g => g.status !== "pass")?.gate;
      if (nextGate) {
        console.log(`Expert Recommendation: Review ${chalk.bold(nextGate)} then run /ck-approve ${nextGate}`);
      }
    }
  } else if (report.currentPhase === "deployment" && report.status === "success") {
    console.log(chalk.green("\nPipeline successfully completed all phases."));
  } else {
    console.log(chalk.blue(`\nPhase '${report.currentPhase}' completed. Run /ck-run to continue.`));
  }

  console.log("");
}

program
  .command("init")
  .description("Legacy init command (DEPRECATED: Use /ck-init)")
  .argument("<idea>", "Project idea")
  .option("-m, --mode <mode>", "turbo | builder | pro | expert", "builder")
  .action((idea: string, options: { mode?: string }) => {
    console.warn(chalk.yellow("Warning: 'init' is deprecated. Use '/ck-init' for namespaced commands."));
    executePipeline(idea, { mode: normalizeMode(options.mode) });
  });

program
  .command("/ck-mode")
  .description("Set Code Kit Ultra mode")
  .argument("[mode]", "turbo | builder | pro | expert")
  .action((mode?: string) => {
    const memory = loadProjectMemory();
    const currentMode = memory.runs[0]?.mode ?? "builder";

    if (!mode) {
      printModeSet(currentMode);
      return;
    }

    const newMode = normalizeMode(mode);
    // Persist mode by updating memory
    if (memory.runs[0]) {
       memory.runs[0].mode = newMode;
       saveProjectMemory(memory);
    }
    printModeSet(newMode);
  });

program
  .command("/ck-run")
  .description("Run the Code Kit Ultra pipeline")
  .argument("[idea]", "Project idea (defaults to last idea)")
  .option("-m, --mode <mode>", "turbo | builder | pro | expert")
  .action((idea: string | undefined, options: { mode?: string }) => {
    executePipeline(idea, { mode: options.mode ? normalizeMode(options.mode) : undefined });
  });

program
  .command("/ck-approve")
  .description("Manually approve a gate")
  .argument("<gate>", "Gate ID to approve")
  .action((gateId: string) => {
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];

    if (!lastRun) {
      console.error(chalk.red("No recent run found to approve gates for."));
      return;
    }

    const approvedGates = new Set(lastRun.approvedGates || []);
    approvedGates.add(gateId);
    lastRun.approvedGates = Array.from(approvedGates);

    saveProjectMemory(memory);
    console.log(chalk.green(`\nGate '${gateId}' approved.`));
    console.log(`Run /ck-run to continue.\n`);
  });

program
  .command("/ck-init")
  .description("Initialize a new Code Kit project")
  .argument("<idea>", "Project idea")
  .action((idea: string) => {
    executePipeline(idea, { mode: "builder" });
  });

program
  .command("/ck-build")
  .description("Expert: Run build stage")
  .action(() => {
    executePipeline(undefined, { mode: "expert", stage: "build" });
  });

program
  .command("/ck-test")
  .description("Expert: Run test stage")
  .action(() => {
    executePipeline(undefined, { mode: "expert", stage: "test" });
  });

program
  .command("/ck-review")
  .description("Expert: Run review stage")
  .action(() => {
    executePipeline(undefined, { mode: "expert", stage: "review" });
  });

program
  .command("/ck-execute")
  .description("Execute an action batch (JSON)")
  .argument("<json>", "Action batch JSON")
  .action(async (json: string) => {
    const { handleExecute } = await import("../../../packages/command-engine/src/handlers/execute");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    
    if (!lastRun) {
      console.error(chalk.red("No active run found."));
      return;
    }

    const context = {
      mode: lastRun.mode || "builder",
      runId: lastRun.id || "run-dev",
      workspaceRoot: process.cwd(),
    };

    const result = await handleExecute({ text: json }, context);
    if (result.ok) {
      console.log(chalk.green(`\nSuccess: ${result.message}`));
      // @ts-ignore
      console.log(chalk.dim(`Logs and artifacts saved to .ck/`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-project-report")
  .description("Display the Code Kit Ultra project status report")
  .action(() => {
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];

    if (!lastRun) {
      console.log("No runs recorded yet.");
      return;
    }

    console.log(chalk.cyan("\nCode Kit Ultra — Project Report\n"));
    console.log(chalk.green("Last Idea:"), memory.lastIdea);
    console.log(chalk.green("Last Mode:"), lastRun.mode?.toUpperCase());
    console.log(chalk.green("Status:"), lastRun.summary);
    console.log(chalk.green("Approved Gates:"), lastRun.approvedGates?.join(", ") || "None");
    console.log(chalk.green("Artifacts:"), lastRun.artifactDirectory);
    console.log("");
  });

program
  .command("/ck-pending")
  .description("List pending action batches")
  .action(async () => {
    const { handlePending } = await import("../../../packages/command-engine/src/handlers/pending");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    const context = {
      mode: lastRun?.mode || "builder" as Mode,
      runId: lastRun?.id,
      workspaceRoot: process.cwd(),
    };
    const result = await handlePending({}, context);
    if (result.ok) {
      console.log(chalk.cyan(`\nPending Batches:`));
      const batches = result.data as any[];
      if (!batches.length) console.log("  No pending batches.");
      batches.forEach(b => {
        console.log(`- ${chalk.bold(b.id)} [${b.phase}] | risk: L=${b.riskSummary.low} M=${b.riskSummary.medium} H=${b.riskSummary.high} | ${b.status}`);
      });
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-approve-batch")
  .description("Approve and execute a queued batch")
  .argument("<batchId>", "Batch ID to approve")
  .action(async (batchId: string) => {
    const { handleApproveBatch } = await import("../../../packages/command-engine/src/handlers/approve-batch");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    const context = {
      mode: lastRun?.mode || "builder" as Mode,
      runId: lastRun?.id,
      workspaceRoot: process.cwd(),
    };
    const result = await handleApproveBatch({ args: [batchId] }, context);
    if (result.ok) {
      console.log(chalk.green(`\nBatch ${batchId} approved and executed.`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-preview")
  .description("Preview an action batch")
  .argument("<json>", "Action batch JSON")
  .action(async (json: string) => {
    const { handlePreview } = await import("../../../packages/command-engine/src/handlers/preview");
    const result = await handlePreview({ text: json }, { workspaceRoot: process.cwd(), mode: "builder" as Mode });
    if (result.ok) {
      console.log((result.data as any).markdown);
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-resume")
  .description("Resume a paused run")
  .action(async () => {
    const { handleResume } = await import("../../../packages/command-engine/src/handlers/resume");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    if (!lastRun) {
       console.error(chalk.red("No recent run to resume."));
       return;
    }
    const context = {
      runId: lastRun.id,
      workspaceRoot: process.cwd(),
      mode: lastRun.mode || "builder" as Mode
    };
    const result = await handleResume({}, context);
    if (result.ok) {
      console.log(chalk.green(`\n${result.message}`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-rollback")
  .description("Rollback changes from the last run")
  .action(async () => {
    const { handleRollback } = await import("../../../packages/command-engine/src/handlers/rollback");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    if (!lastRun) {
       console.error(chalk.red("No recent run to rollback."));
       return;
    }
    const context = {
      runId: lastRun.id,
      workspaceRoot: process.cwd(),
      mode: lastRun.mode || "builder" as Mode
    };
    const result = await handleRollback({}, context);
    if (result.ok) {
      console.log(chalk.green(`\n${result.message}`));
      const data = result.data as any;
      data.notes.forEach((n: string) => console.log(`  ${n}`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-doctor")
  .description("Perform a site health check and validate environment")
  .action(() => {
    const memory = loadProjectMemory();
    console.log(
      JSON.stringify(
        {
          status: "ok",
          lastRunAt: memory.lastRunAt,
          lastIdea: memory.lastIdea,
          totalStoredRuns: memory.runs.length,
          version: "1.1.1-trust",
        },
        null,
        2,
      ),
    );
  });

program
  .command("/ck-constraints")
  .description("Define constraint policies for governed autonomy")
  .argument("<json>", "Constraint policy JSON")
  .action(async (json: string) => {
    const { handleConstraints } = await import("../../../packages/command-engine/src/handlers/constraints");
    const memory = loadProjectMemory();
    const lastRun = memory.runs[0];
    const context = {
      mode: lastRun?.mode || "builder" as Mode,
      runId: lastRun?.id,
      workspaceRoot: process.cwd(),
    };
    const result = await handleConstraints({ text: json }, context);
    if (result.ok) {
      console.log(chalk.green(`\nSuccess: ${result.message}`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-validate")
  .description("Validate a batch structure")
  .argument("<json>", "Batch JSON")
  .action(async (json: string) => {
    const { handleValidate } = await import("../../../packages/command-engine/src/handlers/validate");
    const result = await handleValidate({ text: json }, { mode: "builder" as Mode });
    if (result.ok) {
      console.log(chalk.green(`\nSuccess: ${result.message}`));
    } else {
      console.error(chalk.red(`\nError: ${result.message}`));
    }
  });

program
  .command("/ck-consensus")
  .description("Compute consensus between agents")
  .argument("<json>", "Votes array JSON")
  .action(async (json: string) => {
    const { handleConsensus } = await import("../../../packages/command-engine/src/handlers/consensus");
    const result = await handleConsensus({ text: json }, { mode: "builder" as Mode });
    if (result.ok) {
      console.log(chalk.green(`\nSuccess: ${result.message}`));
    } else {
      console.error(chalk.yellow(`\nRevision Required: ${result.message}`));
    }
  });

program
  .command("/ck-score")
  .description("Score execution confidence")
  .argument("<json>", "Score payload JSON")
  .action(async (json: string) => {
    const { handleScore } = await import("../../../packages/command-engine/src/handlers/score");
    const result = await handleScore({ text: json }, { mode: "builder" as Mode });
    if (result.ok) {
      console.log(chalk.green(`\nConfidence High: ${result.message}`));
    } else {
      console.error(chalk.red(`\nConfidence Low: ${result.message}`));
    }
  });

program
  .command("/ck-killswitch")
  .description("Evaluate the kill switch for a batch")
  .argument("<json>", "Kill switch payload JSON")
  .action(async (json: string) => {
    const { handleKillSwitch } = await import("../../../packages/command-engine/src/handlers/killswitch");
    const result = await handleKillSwitch({ text: json }, { mode: "builder" as Mode });
    if (result.ok) {
      console.log(chalk.green(`\nSuccess: ${result.message}`));
    } else {
      console.error(chalk.red(`\nBlocked: ${result.message}`));
    }
  });

program
  .command("/ck-trace")
  .description("View the governance trace for a specific runId")
  .argument("<runId>", "The run ID to trace")
  .action(async (runId: string) => {
    const { handleTrace } = await import("../../../packages/command-engine/src/handlers/trace");
    handleTrace(JSON.stringify({ runId }));
  });

program
  .command("/ck-timeline")
  .description("View the event timeline for a specific runId")
  .argument("<runId>", "The run ID to view")
  .action(async (runId: string) => {
    const { handleTimeline } = await import("../../../packages/command-engine/src/handlers/timeline");
    handleTimeline(JSON.stringify({ runId }));
  });

program
  .command("/ck-report")
  .description("Generate a markdown execution report for a runId")
  .argument("<runId>", "The run ID to report")
  .action(async (runId: string) => {
    const { handleReport } = await import("../../../packages/command-engine/src/handlers/report");
    handleReport(JSON.stringify({ runId }));
  });

program
  .command("/ck-score-explain")
  .description("Explain the confidence score breakdown for a runId")
  .argument("<runId>", "The run ID to explain")
  .action(async (runId: string) => {
    const { handleScoreExplain } = await import("../../../packages/command-engine/src/handlers/score-explain");
    handleScoreExplain(JSON.stringify({ runId }));
  });

program
  .command("/ck-vote")
  .description("Process an agent vote (stub)")
  .argument("<json>", "Vote JSON")
  .action(async (json: string) => {
    const { handleVote } = await import("./handlers/vote");
    console.log(handleVote(json));
  });

program
  .command("/ck-consensus-adaptive")
  .description("Compute adaptive consensus")
  .argument("<json>", "Consensus input JSON")
  .action(async (json: string) => {
    const { handleAdaptiveConsensus } = await import("./handlers/consensus-adaptive");
    console.log(handleAdaptiveConsensus(json));
  });

program
  .command("/ck-agent-profile")
  .description("View or update agent reliability profiles")
  .argument("[json]", "Optional stats JSON for update")
  .action(async (json?: string) => {
    const { handleAgentProfile } = await import("./handlers/agent-profile");
    console.log(handleAgentProfile(json));
  });

program
  .command("/ck-consensus-sim")
  .description("Simulate adaptive consensus with verbose output")
  .argument("<json>", "Consensus input JSON")
  .action(async (json: string) => {
    const { handleConsensusSim } = await import("./handlers/consensus-sim");
    console.log(handleConsensusSim(json));
  });

import { registerOutcomeCommand } from "./handlers/outcome";
import { registerLearningReportCommand } from "./handlers/learning-report";
import { registerAgentEvolutionCommand } from "./handlers/agent-evolution";
import { registerPolicyDiffCommand } from "./handlers/policy-diff";
import { registerConsensusSimFileCommand } from "./handlers/consensus-sim";

registerOutcomeCommand(program);
registerLearningReportCommand(program);
registerAgentEvolutionCommand(program);
registerPolicyDiffCommand(program);
registerConsensusSimFileCommand(program);

program
  .command("/ck-metrics")
  .description("Display project metrics and stats")
  .action(() => {
    const memory = loadProjectMemory();
    const runsByMode: Record<string, number> = {};

    for (const run of memory.runs) {
      const key = run.mode ?? "unknown";
      runsByMode[key] = (runsByMode[key] ?? 0) + 1;
    }

    console.log(
      JSON.stringify(
        {
          totalRuns: memory.runs.length,
          uniqueIdeas: new Set(memory.recentIdeas).size,
          lastRunAt: memory.lastRunAt,
          lastIdea: memory.lastIdea,
          runsByMode,
        },
        null,
        2,
      ),
    );
  });

program.parse();