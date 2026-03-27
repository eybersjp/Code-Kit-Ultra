import type { CKMode } from "./types";

export interface ModeExecutionPolicy {
  mode: CKMode;
  autoExecuteSafeActions: boolean;
  requireApprovalForMediumRisk: boolean;
  requireApprovalForHighRisk: boolean;
  allowCommandExecution: boolean;
  dryRunByDefault: boolean;
}

export const MODE_EXECUTION_POLICIES: Record<CKMode, ModeExecutionPolicy> = {
  turbo: {
    mode: "turbo",
    autoExecuteSafeActions: true,
    requireApprovalForMediumRisk: false,
    requireApprovalForHighRisk: true,
    allowCommandExecution: true,
    dryRunByDefault: false,
  },
  builder: {
    mode: "builder",
    autoExecuteSafeActions: true,
    requireApprovalForMediumRisk: true,
    requireApprovalForHighRisk: true,
    allowCommandExecution: true,
    dryRunByDefault: false,
  },
  pro: {
    mode: "pro",
    autoExecuteSafeActions: false,
    requireApprovalForMediumRisk: true,
    requireApprovalForHighRisk: true,
    allowCommandExecution: true,
    dryRunByDefault: true,
  },
  expert: {
    mode: "expert",
    autoExecuteSafeActions: false,
    requireApprovalForMediumRisk: true,
    requireApprovalForHighRisk: true,
    allowCommandExecution: true,
    dryRunByDefault: true,
  },
};
