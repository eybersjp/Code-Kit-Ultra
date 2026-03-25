import type { FailureClassification } from "../../shared/src/phase10_5-types";

export function classifyFailure(errorMessage: string, adapterId: string): FailureClassification {
  const lower = errorMessage.toLowerCase();

  if (lower.includes("enoent") || lower.includes("no such file") || lower.includes("path not found")) {
    return { failureType: "path-not-found", confidence: 0.92, reason: "Missing path or file detected." };
  }
  if (lower.includes("permission denied") || lower.includes("eacces")) {
    return { failureType: "permission-denied", confidence: 0.9, reason: "Permission failure detected." };
  }
  if (lower.includes("not allowed") || lower.includes("blocked by policy")) {
    return { failureType: "policy-blocked", confidence: 0.88, reason: "Policy restriction detected." };
  }
  if (adapterId === "github" && (lower.includes("auth") || lower.includes("token") || lower.includes("unauthorized"))) {
    return { failureType: "git-auth-failed", confidence: 0.87, reason: "GitHub authentication issue detected." };
  }
  if (adapterId === "github" && (lower.includes("branch") || lower.includes("diverged"))) {
    return { failureType: "branch-diverged", confidence: 0.81, reason: "Git branch state issue detected." };
  }
  if (lower.includes("verify") || lower.includes("verification failed")) {
    return { failureType: "verification-failed", confidence: 0.8, reason: "Post-execution verification failure detected." };
  }
  if (lower.includes("timeout") || lower.includes("network")) {
    return { failureType: "network-transient", confidence: 0.76, reason: "Transient network-like failure detected." };
  }
  return {
    failureType: "unknown-failure",
    confidence: 0.45,
    reason: `No canonical mapping found for adapter ${adapterId}.`,
  };
}
