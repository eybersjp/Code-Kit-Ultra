#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { loadProjectMemory } from "../../../packages/memory/src";
import { runVerticalSlice } from "../../../packages/orchestrator/src";
import { getModePolicy } from "../../../packages/orchestrator/src/mode-controller";
import type { GateDecision, Mode, SelectedSkill, Task } from "../../../packages/shared/src";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import axios from "axios";
import { saveProjectMemory } from "../../../packages/memory/src";
import {
  interactiveRunWorkflow,
  promptYesNo,
  selectFromList,
  promptText,
} from "./lib/interactive-prompts.js";

const CONFIG_DIR = path.join(os.homedir(), ".ck");
const SESSION_PATH = path.join(CONFIG_DIR, "session.json");
const CONTROL_SERVICE_URL = process.env.CKU_CONTROL_SERVICE_URL || process.env.CKU_API_URL || "http://localhost:8080";

const api = axios.create({ baseURL: CONTROL_SERVICE_URL });

function getSession() {
  try {
    if (fs.existsSync(SESSION_PATH)) {
      return JSON.parse(fs.readFileSync(SESSION_PATH, "utf-8"));
    }
  } catch {}
  return null;
}

api.interceptors.request.use((config: any) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

function normalizeMode(input: string | undefined): Mode {
  const mode = input?.toLowerCase();
  if (mode === "turbo" || mode === "builder" || mode === "pro" || mode === "expert" || mode === "safe" || mode === "balanced" || mode === "god") {
    return mode as Mode;
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
    expert: { AI: "Minimal", User: "Full", Pipeline: "MANUAL" },
    safe: { AI: "Minimal", User: "High", Pipeline: "GUARDED" },
    balanced: { AI: "Moderate", User: "Moderate", Pipeline: "HYBRID" },
    god: { AI: "Maximum", User: "Zero", Pipeline: "AUTONOMIC" },
  }[normalized];

  if (!behaviors) {
    console.log(chalk.red(`\nError: No behavior mapping found for mode ${normalized}`));
    return;
  }

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
  .option("-i, --interactive", "Interactive mode (ask questions)")
  .action(async (idea: string | undefined, options: { mode?: string; interactive?: boolean }) => {
    if (options.interactive) {
      const config = await interactiveRunWorkflow();
      executePipeline(config.idea, {
        mode: config.mode,
      });
    } else {
      executePipeline(idea, { mode: options.mode ? normalizeMode(options.mode) : undefined });
    }
  });

program
  .command("/ck-interactive")
  .description("Interactive setup for Code Kit Ultra (guided workflow)")
  .action(async () => {
    const config = await interactiveRunWorkflow();
    executePipeline(config.idea, {
      mode: config.mode,
    });
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

import { registerPhase10Commands } from "./phase10-commands.js";
registerPhase10Commands(program);

import { registerPhase10_5Commands } from "./phase10_5-commands.js";
registerPhase10_5Commands(program);

// --- Auth Subsystem ---
const auth = program.command("auth").description("Session-aware authentication commands");

auth
  .command("status")
  .description("Show current authentication status")
  .action(() => {
    const session = getSession();
    if (!session) {
      console.log(chalk.yellow("Not logged in."));
      return;
    }

    console.log(chalk.cyan("\nAuthentication Status:"));
    console.log(chalk.green("Actor:"), session.actor?.actorName || session.actor?.actorId);
    console.log(chalk.green("Type:"), session.actor?.actorType);
    console.log(chalk.green("Org:"), session.tenant?.orgId);
    console.log(chalk.green("Workspace:"), session.tenant?.workspaceId || "N/A");
    console.log(chalk.green("Project:"), session.tenant?.projectId || "N/A");
    console.log("");
  });

auth
  .command("login")
  .description("Login with an InsForge or Service Account token")
  .argument("<token>", "JWT bearer token")
  .action(async (token: string) => {
    try {
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);

      // Verify the token by calling /v1/session
      const response = await api.get("/v1/session", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sessionData = {
        token,
        ...response.data
      };

      fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2));
      console.log(chalk.green("\nSuccessfully logged in."));
      console.log(chalk.dim(`Session: ${sessionData.actor?.actorName || sessionData.actor?.actorId} (${sessionData.actor?.actorType})\n`));
    } catch (err: any) {
      console.error(chalk.red(`\nLogin failed: ${err.response?.data?.error || err.message}`));
    }
  });

auth
  .command("login-interactive")
  .description("Interactive login (prompts for token)")
  .action(async () => {
    console.log(chalk.bold.cyan("\n🔐 Code Kit Ultra — Interactive Login\n"));

    const token = await promptText("Enter your JWT bearer token:");

    try {
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);

      // Verify the token by calling /v1/session
      const response = await api.get("/v1/session", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sessionData = {
        token,
        ...response.data
      };

      fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2));
      console.log(chalk.green("\n✓ Successfully logged in!"));
      console.log(chalk.dim(`Session: ${sessionData.actor?.actorName || sessionData.actor?.actorId} (${sessionData.actor?.actorType})\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✗ Login failed: ${err.response?.data?.error || err.message}\n`));
    }
  });

auth
  .command("logout")
  .description("Clear the local session")
  .action(() => {
    if (fs.existsSync(SESSION_PATH)) {
      fs.unlinkSync(SESSION_PATH);
      console.log(chalk.cyan("Logged out. Local session cleared."));
    } else {
      console.log("Already logged out.");
    }
  });

// --- Run Management ---
const runCmd = program.command("run").description("Remote run management");

runCmd
  .command("create")
  .description("Create a new execution run on the control plane")
  .option("-p, --project <id>", "Target project ID")
  .argument("<idea>", "Project idea")
  .action(async (idea: string, options: { project?: string }) => {
    try {
      const response = await api.post("/runs", {
        idea,
        projectId: options.project
      });
      console.log(chalk.green(`\nRun created: ${response.data.id}`));
      console.log(chalk.dim(`Status: ${response.data.status}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\nFailed to create run: ${err.response?.data?.error || err.message}`));
    }
  });

const runsCmd = program.command("runs").description("List and manage Multiple runs");

runsCmd
  .command("list")
  .description("List all execution runs")
  .action(async () => {
    try {
      const response = await api.get("/runs");
      const runs = response.data as any[];
      console.log(chalk.cyan("\nExecution Runs:"));
      if (!runs.length) console.log("  No runs found.");
      runs.forEach(r => {
        const statusColor = r.status === "success" ? chalk.green : r.status === "failed" ? chalk.red : chalk.yellow;
        console.log(`- ${chalk.bold(r.id)} | ${statusColor(r.status.padEnd(10))} | ${r.idea.substring(0, 40)}...`);
      });
      console.log("");
    } catch (err: any) {
      console.error(chalk.red(`\nFailed to list runs: ${err.response?.data?.error || err.message}`));
    }
  });

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

program
  .command("serve")
  .description("Start the Code Kit Control Service")
  .option("-p, --port <number>", "Port to run on", "3100")
  .action(async (options: { port: string }) => {
    const { exec } = await import("node:child_process");
    console.log(chalk.cyan(`\nStarting Code Kit Control Service on port ${options.port}...`));
    const child = exec(`npx ts-node apps/control-service/src/index.ts --port ${options.port}`);
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });

program
  .command("/ck-retry-step")
  .description("Retry a specific step in a run")
  .argument("<runId>", "The run ID")
  .argument("[stepId]", "Optional specific step ID to retry")
  .action(async (runId: string, stepId?: string) => {
    const { retryTask } = await import("../../../packages/orchestrator/src/index");
    try {
      console.log(chalk.cyan(`\nRetrying step ${stepId || "current"} in run ${runId}...`));
      await retryTask(runId, stepId);
      console.log(chalk.green("Success: Step retry initiated."));
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  });

program
  .command("/ck-rollback-step")
  .description("Manually rollback a specific step's side effects")
  .argument("<runId>", "The run ID")
  .argument("[stepId]", "Optional specific step ID to rollback")
  .action(async (runId: string, stepId?: string) => {
    const { rollbackTask } = await import("../../../packages/orchestrator/src/index");
    try {
      console.log(chalk.cyan(`\nRolling back step ${stepId || "last"} in run ${runId}...`));
      await rollbackTask(runId, stepId);
      console.log(chalk.green("Success: Step rollback completed."));
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  });

// Main interactive menu command
program
  .command("/ck-menu")
  .description("Show interactive menu of common tasks")
  .action(async () => {
    console.log(chalk.bold.cyan("\n📋 Code Kit Ultra — Main Menu\n"));

    const actions = [
      { name: chalk.green("Run governed pipeline (interactive)"), value: "run" },
      { name: chalk.green("Login (interactive)"), value: "login" },
      { name: chalk.cyan("Check authentication status"), value: "status" },
      { name: chalk.cyan("List recent runs"), value: "runs" },
      { name: chalk.cyan("Initialize new project"), value: "init" },
      { name: chalk.red("Exit"), value: "exit" },
    ];

    let continueMenu = true;
    while (continueMenu) {
      const selection = await selectFromList("Select an action:", actions);

      switch (selection) {
        case "run":
          const config = await interactiveRunWorkflow();
          await executePipeline(config.idea, {
            mode: config.mode,
          });
          break;

        case "login":
          console.log(chalk.bold.cyan("\n🔐 Login\n"));
          const token = await promptText("Enter your JWT bearer token:");
          try {
            if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
            const response = await api.get("/v1/session", {
              headers: { Authorization: `Bearer ${token}` }
            });
            const sessionData = { token, ...response.data };
            fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2));
            console.log(chalk.green("✓ Successfully logged in!\n"));
          } catch (err: any) {
            console.error(chalk.red(`✗ Login failed: ${err.response?.data?.error || err.message}\n`));
          }
          break;

        case "status":
          const session = getSession();
          if (!session) {
            console.log(chalk.yellow("Not logged in.\n"));
          } else {
            console.log(chalk.cyan("\n🔐 Authentication Status:"));
            console.log(chalk.green("✓ Logged in"));
            console.log(chalk.dim(`  Actor: ${session.actor?.actorName || session.actor?.actorId}`));
            console.log(chalk.dim(`  Type: ${session.actor?.actorType}`));
            console.log(chalk.dim(`  Org: ${session.tenant?.orgId}\n`));
          }
          break;

        case "runs":
          try {
            const memory = loadProjectMemory();
            if (!memory.runs || memory.runs.length === 0) {
              console.log(chalk.yellow("\nNo recent runs found.\n"));
            } else {
              console.log(chalk.cyan("\n📋 Recent Runs:\n"));
              memory.runs.slice(0, 5).forEach((run, i) => {
                const runState = run as any;
                const status = runState.status || runState.state?.status || "pending";
                console.log(chalk.dim(`${i + 1}. ${run.id} — ${status}`));
              });
              console.log("");
            }
          } catch (err) {
            console.log(chalk.yellow("\nNo project data found.\n"));
          }
          break;

        case "init":
          const idea = await promptText("What do you want to build?");
          await executePipeline(idea, { mode: "builder" });
          break;

        case "exit":
          continueMenu = false;
          console.log(chalk.cyan("Goodbye!\n"));
          break;
      }
    }
  });

program.parse();