/**
 * Core types for the Code-Kit-Ultra system.
 * These types define the shared data model used across all packages.
 */
export type Mode = "turbo" | "builder" | "pro" | "expert" | "safe" | "balanced" | "god";
export type CKMode = Mode;

export type RunStatus = "planned" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "success" | "failed" | "paused" | "skipped" | "rolled-back";
export type Role = "admin" | "operator" | "reviewer" | "viewer";
export type ExecutionRisk = "low" | "medium" | "high";

export interface AuthUser {
  id: string;
  role: Role;
  apiKeyId?: string;
}
export type TaskStatus = StepStatus;
export type GateStatus = "pass" | "fail" | "needs-review" | "blocked" | "pending";

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

export interface GeneratedSkillManifest {
  id?: string;
  skillId: string;
  name?: string;
  description?: string;
  version: string;
  status: string;
  createdAt: string;
  auditTrail: Array<{ action: string; at: string; notes: string }>;
}

export type Priority =
  | "speed"
  | "quality"
  | "low-cost"
  | "best-ux"
  | "scalability"
  | "business-ready";

export type Deliverable =
  | "app"
  | "automation"
  | "website"
  | "mvp"
  | "internal-tool"
  | "agent-system"
  | "docs"
  | "business-package";

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
  skillLevel?: "beginner" | "intermediate" | "advanced";
  priority?: Priority;
  deliverable?: Deliverable;
  allowCommandExecution?: boolean;
  dryRun?: boolean;
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

export interface RetryPolicy {
  maxAttempts: number;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  doneDefinition: string;
  taskType: string;
  adapterId: string;
  payload: Record<string, unknown>;
  requiresApproval?: boolean;
  retryPolicy?: RetryPolicy;
  rollbackPayload?: Record<string, unknown>;
}

export interface SkillMatch {
  skillId: string;
  reason: string;
  source: "installed" | "generated";
}

export interface StepExecutionLog {
  stepId: string;
  title: string;
  adapter: string;
  attempt: number;
  status: StepStatus;
  startedAt: string;
  finishedAt?: string;
  output?: string;
  error?: string;
  rollbackAvailable: boolean;
  risk?: ExecutionRisk;
  simulationSummary?: string;
  verificationStatus?: "passed" | "failed";
  verificationSummary?: string;
  fixSuggestion?: string;
}

export interface AdapterExecutionSummary {
  taskId: string;
  adapter: string;
  status: StepStatus;
  attempts: number;
  output: string;
}

export interface IntakeArtifact {
  runId: string;
  createdAt: string;
  idea: string;
  input: UserInput;
  assumptions: Assumption[];
  clarifyingQuestions: ClarifyingQuestion[];
}

export interface PlanArtifact {
  runId: string;
  createdAt: string;
  summary: string;
  selectedSkills: SkillMatch[];
  tasks: PlanTask[];
}

export interface AdapterArtifact {
  runId: string;
  createdAt: string;
  executions: AdapterExecutionSummary[];
}

export interface ExecutionLogArtifact {
  runId: string;
  createdAt: string;
  steps: StepExecutionLog[];
}

export interface RunState {
  runId: string;
  createdAt: string;
  updatedAt: string;
  currentStepIndex: number;
  status: RunStatus;
  pauseReason?: string;
  approvalRequired: boolean;
  approved: boolean;
}

export interface RunBundle {
  intake: IntakeArtifact;
  plan: PlanArtifact;
  gates: GateDecision[];
  adapters: AdapterArtifact;
  executionLog: ExecutionLogArtifact;
  state: RunState;
  auditLog: AuditLogArtifact;
  reportMarkdown: string;
}

export interface PolicyRules {
  requireApprovalFor: string[];
  maxRetries: number;
  allowRollback: boolean;
  blockCommands: string[];
  requirePrReview: boolean;
}

export interface PolicyProfile {
  mode: string;
  rules: PolicyRules;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval?: boolean;
  reason?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  runId: string;
  actor: string;
  role: Role | "system";
  action: string;
  stepId?: string;
  details?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface AuditLogArtifact {
  runId: string;
  createdAt: string;
  updatedAt: string;
  events: AuditEvent[];
}

export interface GateDecision {
  gate: string;
  status: "pass" | "fail" | "needs-review" | "blocked" | "pending";
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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
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

// Keep legacy RunReport for backward compatibility during phased migration if needed
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
  overallGateStatus: string;
  currentPhase: Phase;
  completedPhases: Phase[];
  status?: "success" | "failure" | "in-progress" | "blocked" | "awaiting-approval";
  createdAt: string;
  updatedAt?: string;
}
