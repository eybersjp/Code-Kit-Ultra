import { loadGovernancePolicy, validateReviewerRole } from "./policy";
import { writeAudit } from "./audit";
import { rollbackSkill as doRollback } from "../../skill-engine/src/promotion";

export function rollbackSkill(skillId: string, reviewer: string) {
  const policy = loadGovernancePolicy();
  if (!policy.promotion.allowRollback) throw new Error("Rollback is disabled by governance policy.");
  validateReviewerRole(reviewer);
  const manifest = doRollback(skillId, reviewer);
  writeAudit({ action: "rollback", skillId, reviewer });
  return manifest;
}