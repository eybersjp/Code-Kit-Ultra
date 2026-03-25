export type OutcomeStatus = "success" | "partial" | "failed";

export interface RunOutcome {
  runId: string;
  status: OutcomeStatus;
  success: boolean;
  retryCount: number;
  timeTakenMs: number;
  qualityScore: number;
  adaptersUsed: string[];
  dominantFailureType?: string;
  notes?: string;
  userRating?: number;
  userFeedback?: string;
  createdAt: string;
}

export interface FailurePattern {
  id: string;
  adapterId: string;
  failureType: string;
  fixSuggestion: string;
  confidence: number;
  occurrences: number;
  lastSeenAt: string;
}

export interface AdapterReliability {
  adapterId: string;
  successRate: number;
  avgRetries: number;
  reliabilityScore: number;
  totalRuns: number;
  updatedAt: string;
}

export interface AdaptivePolicyOverlay {
  adapterId: string;
  riskMultiplier: number;
  suggestedMaxRetries: number;
  requireApproval: boolean;
  reason: string;
  updatedAt: string;
}

export interface LearningStore {
  version: number;
  outcomes: RunOutcome[];
  patterns: FailurePattern[];
  reliability: AdapterReliability[];
  policyOverlays: AdaptivePolicyOverlay[];
  updatedAt: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: "adapter-choice" | "retry-policy" | "approval" | "ordering";
  summary: string;
  reason: string;
  impact: "low" | "medium" | "high";
}

export interface LearningReport {
  generatedAt: string;
  totalOutcomes: number;
  topPatterns: FailurePattern[];
  weakestAdapters: AdapterReliability[];
  strongestAdapters: AdapterReliability[];
  overlays: AdaptivePolicyOverlay[];
}
