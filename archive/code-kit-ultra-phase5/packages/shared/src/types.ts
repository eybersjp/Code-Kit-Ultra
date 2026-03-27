export type Mode = "safe" | "balanced" | "god";
export type GateType = "clarity" | "scope" | "architecture" | "build" | "qa" | "security" | "cost" | "deployment" | "launch";
export type TaskType = "planning" | "implementation" | "skills" | "automation" | "deployment" | "general";

export interface UserInput {
  idea: string;
  mode: Mode;
  dryRun?: boolean;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  priority?: "speed" | "quality" | "low-cost" | "best-ux" | "scalability" | "business-ready";
  deliverable?: "app" | "automation" | "website" | "mvp" | "internal-tool" | "agent-system" | "docs" | "business-package";
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

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  taskType: TaskType;
  doneDefinition: string;
}

export interface SkillMatch {
  skillId: string;
  reason: string;
  source: "installed" | "generated";
  taskType: TaskType;
  generatedPath?: string;
}

export interface GateDecision {
  gate: GateType;
  status: "pass" | "needs-review" | "blocked";
  reason: string;
  shouldPause: boolean;
}

export interface RouteSelection {
  taskType: TaskType;
  adapterName: string;
  reason: string;
  mode: "real" | "stub";
}

export interface GeneratedSkillManifest {
  skillId: string;
  version: string;
  status: "generated" | "reviewed" | "approved" | "installed" | "rolled-back";
  createdAt: string;
  promotedAt?: string;
  rolledBackAt?: string;
  review?: {
    reviewer?: string;
    notes?: string;
    approved?: boolean;
    reviewedAt?: string;
  };
  auditTrail: Array<{
    action: string;
    by?: string;
    at: string;
    notes?: string;
  }>;
}

export interface RunReport {
  input: UserInput;
  assumptions: Assumption[];
  clarifyingQuestions: ClarifyingQuestion[];
  plan: PlanTask[];
  selectedSkills: SkillMatch[];
  routes: RouteSelection[];
  gates: GateDecision[];
  summary: string;
  createdAt: string;
}