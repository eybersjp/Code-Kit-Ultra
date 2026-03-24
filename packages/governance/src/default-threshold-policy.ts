import type { ThresholdPolicy } from "../../shared/src/governance-types";

export const DEFAULT_THRESHOLD_POLICY: ThresholdPolicy = {
  lowRiskApprovalThreshold: 0.55,
  mediumRiskApprovalThreshold: 0.65,
  highRiskApprovalThreshold: 0.75,
  maxShiftPerLearningCycle: 0.05,
  minThreshold: 0.40,
  maxThreshold: 0.90,
  lastUpdatedAt: new Date(0).toISOString(),
};
