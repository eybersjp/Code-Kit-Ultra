export type Mode = "safe" | "balanced" | "god";

export type GateType =
  | "clarity"
  | "scope"
  | "architecture"
  | "build"
  | "qa"
  | "security"
  | "cost"
  | "deployment"
  | "launch";

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

export type RunStatus = "planned" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "success" | "failed" | "paused" | "skipped" | "rolled-back";
export type Role = "admin" | "operator" | "reviewer" | "viewer";

export interface AuthUser {
  id: string;
  role: Role;
  apiKeyId?: string;
}

export interface UserInput {
  idea: string;
  mode: Mode;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  priority?: Priority;
  deliverable?: Deliverable;
  allowCommandExecution?: boolean;
}

export interface Assumption {
  id: string;
  text: string;
  confidence: "low" | "medium" | "high";
}

export interface ClarifyingQuestion {
  id: string;
  text: string;
  blocking: boolean;
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

export interface GateDecision {
  gate: GateType;
  status: "pass" | "needs-review" | "blocked";
  reason: string;
  shouldPause: boolean;
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
