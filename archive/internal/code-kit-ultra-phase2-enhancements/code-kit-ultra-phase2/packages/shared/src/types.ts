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

export type TaskType = "planning" | "coding" | "skills" | "automation" | "reporting";

export interface UserInput {
  idea: string;
  mode: Mode;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  priority?:
    | "speed"
    | "quality"
    | "low-cost"
    | "best-ux"
    | "scalability"
    | "business-ready";
  deliverable?:
    | "app"
    | "automation"
    | "website"
    | "mvp"
    | "internal-tool"
    | "agent-system"
    | "docs"
    | "business-package";
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
  taskType: TaskType;
}

export interface SkillMatch {
  skillId: string;
  reason: string;
  source: "installed" | "generated";
  generatedPath?: string;
}

export interface GateDecision {
  gate: GateType;
  status: "pass" | "needs-review" | "blocked";
  reason: string;
  shouldPause: boolean;
}

export interface AdapterExecution {
  adapter: string;
  taskId: string;
  taskType: TaskType;
  resultSummary: string;
}

export interface RunPaths {
  baseDir: string;
  jsonReportPath: string;
  markdownReportPath: string;
  consoleLogPath: string;
  gateSnapshotPath: string;
  memoryPath: string;
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
  createdAt: string;
  dryRun: boolean;
  outputDir: string;
  paths?: RunPaths;
}

export interface RunOptions {
  dryRun?: boolean;
  outputDir?: string;
}

export interface PersistentMemory {
  preferredStack?: string;
  preferredMode?: Mode;
  acceptedAssumptions: string[];
  rejectedPatterns: string[];
  successfulSkillMappings: Record<string, string[]>;
  lastIdeas: string[];
}
