import fs from "node:fs";
import path from "node:path";
import type { PlanTask, PolicyEvaluationResult, PolicyProfile } from "../../shared/src/types";

const defaultPolicy: PolicyProfile = {
  mode: "team-safe",
  rules: {
    requireApprovalFor: ["github", "api"],
    maxRetries: 2,
    allowRollback: true,
    blockCommands: ["rm -rf /", "sudo rm -rf /", "mkfs", "dd if=/dev/zero"],
    requirePrReview: true,
  },
};

function policyPath(): string {
  // In a real system, this would be relative to the workspace or a central config dir
  return path.resolve("config/policy.json");
}

export function loadPolicyProfile(): PolicyProfile {
  const file = policyPath();
  if (!fs.existsSync(file)) {
    console.log(`No policy file found at ${file}. Using default team-safe policy.`);
    return defaultPolicy;
  }

  try {
    const content = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(content) as Partial<PolicyProfile>;
    return {
      mode: parsed.mode ?? defaultPolicy.mode,
      rules: {
        ...defaultPolicy.rules,
        ...(parsed.rules ?? {}),
      },
    };
  } catch (err) {
    console.error(`Failed to parse policy file: ${err}. Falling back to defaults.`);
    return defaultPolicy;
  }
}

export function evaluatePolicy(task: PlanTask, policy = loadPolicyProfile()): PolicyEvaluationResult {
  // 1. Command Blacklist check for terminal tasks
  if (task.adapterId === "terminal") {
    const command = String(task.payload.command ?? "");
    if (policy.rules.blockCommands.some((blocked) => command.includes(blocked))) {
      return {
        allowed: false,
        reason: `Blocked by safety policy: command contains forbidden pattern '${command}'`,
      };
    }
  }

  // 2. Adapter Approval check
  const requiresApproval =
    Boolean(task.requiresApproval) || policy.rules.requireApprovalFor.includes(task.adapterId);

  return {
    allowed: true,
    requiresApproval,
    reason: requiresApproval
      ? `Approval required by policy for restricted adapter: ${task.adapterId}`
      : "Action permitted by current policy.",
  };
}
