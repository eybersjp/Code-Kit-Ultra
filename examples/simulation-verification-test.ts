import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { 
  updateIntake, 
  updatePlan, 
  updateRunState, 
  loadRunBundle 
} from "../packages/memory/src/run-store.js";
import { executeRunBundle, resumeRun } from "../packages/orchestrator/src/index.js";
import type { RunBundle, PlanTask } from "../packages/shared/src/types.js";

async function runTest() {
  console.log(chalk.cyan("\n🚀 Phase 9.3: Simulation & Verification Test\n"));

  const runId = `test-sim-ver-${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Setup Mock Run Bundle
  const intake = {
    idea: "Test intelligent execution flow",
    createdAt: now,
    context: { repoRoot: process.cwd() }
  };

  const tasks: PlanTask[] = [
    {
      id: "step-1",
      title: "Write to protected file (Simulation Test)",
      adapterId: "fs",
      payload: {
        path: ".codekit/test-simulation.txt",
        content: "This should trigger a high-risk simulation warning."
      },
      requiresApproval: false,
      phase: "building",
      description: "Test simulation",
      doneDefinition: "File exists",
      taskType: "action"
    },
    {
      id: "step-2",
      title: "Execute safe command (Verification Test)",
      adapterId: "terminal",
      payload: {
        command: "node",
        args: ["-e", "console.log('Verification Success')"],
        allowExecution: true
      },
      phase: "testing",
      description: "Test verification",
      doneDefinition: "Output contains success",
      taskType: "action"
    }
  ];

  const plan = {
    runId,
    createdAt: now,
    tasks,
    totalTasks: tasks.length
  };

  const state = {
    runId,
    status: "planned" as const,
    currentStepIndex: 0,
    createdAt: now,
    updatedAt: now,
    approved: false,
    approvalRequired: false
  };

  // Initialize on disk
  updateIntake(runId, intake as any);
  updatePlan(runId, plan as any);
  updateRunState(runId, state as any);

  console.log(chalk.yellow(`Created Run: ${runId}`));

  // 2. Initial Execution - Expected to pause on Step 1 (High Risk)
  console.log(chalk.blue("\nPhase 1: Starting Execution (Expecting Simulation Pause)..."));
  let bundle = loadRunBundle(runId) as RunBundle;
  console.log(`[TEST DEBUG] Tasks to execute: ${bundle.plan.tasks.length}`);
  console.log(`[TEST DEBUG] Current index: ${bundle.state.currentStepIndex}`);
  
  bundle = await executeRunBundle(bundle);

  console.log(`[TEST DEBUG] After executeRunBundle: status=${bundle.state.status}, index=${bundle.state.currentStepIndex}`);

  if (bundle.state.status === "paused") {
    console.log(chalk.green("✅ SUCCESS: Execution paused as expected."));
    console.log(chalk.dim(`Reason: ${bundle.state.pauseReason}`));
    
    const lastStep = bundle.executionLog.steps[0];
    console.log(chalk.dim(`Step Risk: ${lastStep.risk}`));
    console.log(chalk.dim(`Simulation: ${lastStep.simulationSummary}`));
  } else {
    console.log(chalk.red("❌ FAILURE: Execution did not pause on high-risk task."));
    console.log(chalk.dim(`Final Status: ${bundle.state.status}`));
    if (bundle.executionLog.steps.length > 0) {
      console.log(chalk.dim(`Last Step Error: ${bundle.executionLog.steps[bundle.executionLog.steps.length - 1].error}`));
    }
    process.exit(1);
  }

  // 3. Approval & Resume
  console.log(chalk.blue("\nPhase 2: Approving & Resuming..."));
  bundle = await resumeRun(runId, true, "operator-test");

  // 4. Final Validation
  if (bundle.state.status === "completed") {
    console.log(chalk.green("✅ SUCCESS: Full run completed after approval."));
    
    // Check verification status of terminal step (step-2)
    const terminalStep = bundle.executionLog.steps.find(s => s.stepId === "step-2");
    if (terminalStep?.verificationStatus === "passed") {
      console.log(chalk.green("✅ SUCCESS: Terminal execution verified."));
      console.log(chalk.dim(`Verification Summary: ${terminalStep.verificationSummary}`));
    } else {
      console.log(chalk.red("❌ FAILURE: Terminal execution verification failed or missing."));
      console.log(chalk.dim(JSON.stringify(terminalStep, null, 2)));
    }

    // Check if the file was actually written
    if (fs.existsSync(".codekit/test-simulation.txt")) {
      console.log(chalk.green("✅ SUCCESS: Filesystem task correctly executed."));
      fs.unlinkSync(".codekit/test-simulation.txt"); // Cleanup
    }
  } else {
    console.log(chalk.red(`❌ FAILURE: Run ended with status: ${bundle.state.status}`));
    if (bundle.executionLog.steps.length > 0) {
      const last = bundle.executionLog.steps[bundle.executionLog.steps.length - 1];
      console.log(chalk.red(`Error in ${last.stepId}: ${last.error}`));
      console.log(chalk.dim(`Fix Suggestion: ${last.fixSuggestion}`));
    }
    process.exit(1);
  }

  console.log(chalk.cyan("\n🎯 Phase 9.3 Verification Complete!\n"));
}

runTest().catch(err => {
  console.error(chalk.red("\nFATAL ERROR during verification:"));
  console.error(err);
  process.exit(1);
});
