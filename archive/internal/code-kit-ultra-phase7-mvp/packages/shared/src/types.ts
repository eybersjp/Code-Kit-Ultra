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

export interface UserInput {
  idea: string;
  mode: Mode;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  priority?: Priority;
  deliverable?: Deliverable;
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
  doneDefinition: string;
  taskType: string;
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

export interface AdapterExecution {
  taskId: string;
  adapter: string;
  status: "simulated" | "skipped";
  output: string;
}

export interface RunReport {
  input: UserInput;
  assumptions: Assumption[];
  clarifyingQuestions: ClarifyingQuestion[];
  plan: PlanTask[];
  selectedSkills: SkillMatch[];
  gates: GateDecision[];
  adapterExecutions: AdapterExecution[];
  summary: string;
  shouldPause: boolean;
  createdAt: string;
}
