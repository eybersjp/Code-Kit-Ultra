import type { ThresholdPolicy } from "../../shared/src/phase6-types";

export const DEFAULT_THRESHOLD_POLICY: ThresholdPolicy = {
  lowRiskApprovalThreshold: 0.55,
  mediumRiskApprovalThreshold: 0.65,
  highRiskApprovalThreshold: 0.78,
  maxShiftPerLearningCycle: 0.03,
  minThreshold: 0.50,
  maxThreshold: 0.90,
  lastUpdatedAt: new Date(0).toISOString(),
};
