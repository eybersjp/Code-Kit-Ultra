import fs from "node:fs";
import path from "node:path";

interface GovernancePolicy {
  promotion: {
    requiredReviewerRoles: string[];
    requireApprovalNotes: boolean;
    requireManifestValidation: boolean;
    allowRollback: boolean;
  };
}

export function loadGovernancePolicy(): GovernancePolicy {
  return JSON.parse(fs.readFileSync(path.resolve("config/governance-policy.json"), "utf-8")) as GovernancePolicy;
}

export function validateReviewerRole(reviewer: string) {
  const policy = loadGovernancePolicy();
  if (!policy.promotion.requiredReviewerRoles.includes(reviewer)) {
    throw new Error(`Reviewer role not permitted for promotion flow: ${reviewer}`);
  }
}