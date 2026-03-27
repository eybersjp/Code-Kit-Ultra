export type HealingMode = "observe" | "assist" | "auto";
export type HealingRisk = "low" | "medium" | "high";
export type HealingStatus = "planned" | "awaiting-approval" | "applied" | "verified" | "failed" | "escalated";

export interface HealingPolicy {
  version: number;
  enabled: boolean;
  mode: HealingMode;
  maxHealingAttemptsPerStep: number;
  allowAutoApplyForRisk: HealingRisk[];
  blockedStrategies: string[];
  approvalRequiredForStrategies: string[];
  autoRetryOriginalStepAfterHeal: boolean;
  recordAuditEvents: boolean;
}

export interface HealingContext {
  runId: string;
  stepId: string;
  adapterId: string;
  failureType: string;
  errorMessage: string;
  payload?: Record<string, unknown>;
  workingDirectory?: string;
}

export interface HealingResult {
  success: boolean;
  changedResources?: string[];
  notes?: string;
  requiresRetry?: boolean;
  requiresReverification?: boolean;
}

export interface HealingStrategy {
  id: string;
  failureType: string;
  adapterId: string | "any";
  title: string;
  description: string;
  risk: HealingRisk;
  autoApply: boolean;
  maxAttempts: number;
  preconditions: string[];
  apply: (context: HealingContext) => Promise<HealingResult>;
}

export interface HealingAttempt {
  id: string;
  runId: string;
  stepId: string;
  adapterId: string;
  failureType: string;
  selectedStrategyId?: string;
  candidateStrategyIds: string[];
  status: HealingStatus;
  approvalRequired: boolean;
  startedAt: string;
  endedAt?: string;
  summary: string;
  result?: HealingResult;
}

export interface FailureClassification {
  failureType: string;
  confidence: number;
  reason: string;
}

export interface HealingStrategyStats {
  strategyId: string;
  attempts: number;
  successes: number;
  successRate: number;
  avgRepairTimeMs: number;
  updatedAt: string;
}
