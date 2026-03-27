export type GateName = "clarity" | "plan" | "architecture" | "build" | "review" | "qa" | "security" | "deploy";

export interface GateResult {
  gate: GateName;
  passed: boolean;
  blocking: boolean;
  requiresApproval: boolean;
  reason?: string;
  fixHint?: string;
}
