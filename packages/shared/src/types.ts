/**
 * Core types for the Code-Kit-Ultra system.
 * These types define the shared data model used across all packages.
 */
import type { TimelineEvent, GovernanceTrace } from "./observability-types";

export type Mode = "turbo" | "builder" | "pro" | "expert";

export type TaskStatus = "pending" | "in-progress" | "completed" | "failed" | "rolled-back";

export type GateStatus = "pass" | "fail" | "needs-review" | "blocked" | "pending";

export type TaskType =
  | "planning"
  | "implementation"
  | "skills"
  | "automation"
  | "deployment"
  | "general";

/**
 * The initial intake from the user.
 */
export interface UserInput {
  idea: string;
  mode: Mode;
  dryRun?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * A rule-based or AI-inferred assumption about the project.
 */
export interface Assumption {
  id: string;
  text: string;
  confidence: "low" | "medium" | "high";
}

/**
 * A question generated to resolve ambiguity in the project idea.
 */
export interface ClarifyingQuestion {
  id: string;
  text: string;
  blocking: boolean;
}

/**
 * The result of the intake and clarification phase.
 */
export interface ClarificationResult {
  normalizedIdea: string;
  inferredProjectType: string;
  assumptions: Assumption[];
  clarifyingQuestions: ClarifyingQuestion[];
  completeness: "sufficient-for-initial-planning" | "needs-clarification";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

export interface SelectedSkill {
  skillId: string;
  name?: string;
  category?: string;
  reason: string;
  score?: number;
  source: "registry" | "fallback" | "generated" | "installed";
}

export interface GateDecision {
  gate: string;
  status: GateStatus;
  reason: string;
  shouldPause: boolean;
  recommendedAction?: string;
  explanation?: {
    impact: string;
    fix: string;
  };
}

export type Phase =
  | "intake"
  | "planning"
  | "skills"
  | "gating"
  | "building"
  | "testing"
  | "reviewing"
  | "deployment";

export interface RunReport {
  id?: string;
  input: UserInput;
  intakeResult?: ClarificationResult;
  assumptions: Assumption[];
  clarifyingQuestions: ClarifyingQuestion[];
  plan: Task[];
  selectedSkills: SelectedSkill[];
  gates: GateDecision[];
  approvedGates: string[];
  summary: string;
  overallGateStatus: GateStatus;
  currentPhase: Phase;
  completedPhases: Phase[];
  status?: "success" | "failure" | "in-progress" | "blocked" | "awaiting-approval";
  createdAt: string;
  updatedAt?: string;
  timeline?: TimelineEvent[];
  governanceTrace?: GovernanceTrace;
}

// Support types for contracts.ts
export interface GeneratedSkillManifest {
  skillId: string;
  version: string;
  status: "generated" | "reviewed" | "approved" | "installed" | "rolled-back";
  createdAt: string;
  auditTrail: Array<{
    action: string;
    by?: string;
    at: string;
    notes?: string;
  }>;
}

export interface CommandContext {
  mode: Mode;
  runId?: string;
  workspaceRoot?: string;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  data?: unknown;
}
