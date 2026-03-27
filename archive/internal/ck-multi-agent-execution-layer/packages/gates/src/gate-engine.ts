import type { CKMode } from "../../core/src/types";
import { MODE_CONFIGS } from "../../core/src/mode-controller";
import type { GateResult } from "./types";

export function evaluateGates(run: { mode: CKMode; idea: string; outputs: Record<string, unknown>; approvedGates: string[] }): GateResult[] {
  const cfg = MODE_CONFIGS[run.mode];

  const base: GateResult[] = [
    {
      gate: "clarity",
      passed: run.idea.trim().length >= 10,
      blocking: true,
      requiresApproval: false,
      reason: run.idea.trim().length >= 10 ? undefined : "Idea is too short or vague.",
      fixHint: "Use /ck-clarify or provide a more specific idea.",
    },
    {
      gate: "plan",
      passed: Boolean(run.outputs.plan),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("plan"),
      reason: Boolean(run.outputs.plan) ? undefined : "No plan has been generated yet.",
      fixHint: "Run /ck-plan or /ck-run in a mode that auto-plans.",
    },
    {
      gate: "architecture",
      passed: Boolean(run.outputs.architecture),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("architecture"),
      reason: Boolean(run.outputs.architecture) ? undefined : "Architecture has not been defined.",
      fixHint: "Run /ck-architecture or /ck-run after planning.",
    },
    {
      gate: "build",
      passed: Boolean(run.outputs.build),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("build"),
      reason: Boolean(run.outputs.build) ? undefined : "Build output does not exist yet.",
      fixHint: "Run /ck-build or /ck-run.",
    },
    {
      gate: "review",
      passed: Boolean(run.outputs.review),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("review"),
      reason: Boolean(run.outputs.review) ? undefined : "Review phase has not run yet.",
      fixHint: "Run /ck-review or /ck-run.",
    },
    {
      gate: "qa",
      passed: Boolean(run.outputs.qa),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("qa"),
      reason: Boolean(run.outputs.qa) ? undefined : "QA phase has not run yet.",
      fixHint: "Run /ck-qa or /ck-run.",
    },
    {
      gate: "security",
      passed: Boolean(run.outputs.security),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("security"),
      reason: Boolean(run.outputs.security) ? undefined : "Security phase has not run yet.",
      fixHint: "Run /ck-security or /ck-run.",
    },
    {
      gate: "deploy",
      passed: Boolean(run.outputs.deploy),
      blocking: false,
      requiresApproval: cfg.requireApprovalFor.includes("deploy"),
      reason: Boolean(run.outputs.deploy) ? undefined : "Deploy phase has not run yet.",
      fixHint: "Run /ck-deploy or approve deploy when ready.",
    },
  ];

  return base.map((gate) => {
    if (gate.requiresApproval && run.approvedGates.includes(gate.gate)) {
      return { ...gate, requiresApproval: false };
    }
    return gate;
  });
}
