import type {
  ClarificationResult,
  Task,
  TaskStatus,
  PlanTask,
  UserInput,
} from "../../shared/src";
import path from "node:path";

export interface PlannerInput {
  clarification: ClarificationResult;
}

export interface PlannerOutput {
  tasks: Task[];
}

type ProjectCategory =
  | "web-app"
  | "website"
  | "automation"
  | "ai-agent"
  | "api"
  | "unknown";

const DEFAULT_STATUS: TaskStatus = "pending";

export function buildPlan(input: PlannerInput): PlannerOutput {
  const clarification = input.clarification;
  const category = normalizeCategory(clarification);
  const completeness = getCompletenessScore(clarification);

  const tasks: Task[] = [];

  tasks.push(
    createTask({
      id: "clarify-scope",
      title: "Clarify scope and acceptance criteria",
      description: buildClarificationDescription(clarification, completeness),
      status: completeness >= 0.8 ? "running" : DEFAULT_STATUS,
      type: "planning",
      dependencies: [],
    }),
  );

  tasks.push(
    createTask({
      id: "define-architecture",
      title: "Define architecture and system boundaries",
      description: buildArchitectureDescription(category),
      status: DEFAULT_STATUS,
      type: "planning",
      dependencies: ["clarify-scope"],
    }),
  );

  tasks.push(
    createTask({
      id: "identify-skills",
      title: "Identify required skills and implementation patterns",
      description:
        "Determine the key technical skills, domain patterns, and delivery capabilities required for this project type.",
      status: DEFAULT_STATUS,
      type: "skills",
      dependencies: ["define-architecture"],
    }),
  );

  tasks.push(
    createTask({
      id: "validate-risks",
      title: "Validate risks, dependencies, and constraints",
      description: buildRiskDescription(category, clarification),
      status: DEFAULT_STATUS,
      type: "planning",
      dependencies: ["clarify-scope", "define-architecture"],
    }),
  );

  const categoryTasks = getCategoryTasks(category);
  for (const task of categoryTasks) {
    tasks.push(task);
  }

  tasks.push(
    createTask({
      id: "choose-implementation-path",
      title: "Choose implementation path",
      description:
        "Select the most practical implementation route, sequencing, and delivery approach based on scope clarity, architecture, and risk profile.",
      status: DEFAULT_STATUS,
      type: "planning",
      dependencies: getImplementationDependencies(category),
    }),
  );

  tasks.push(
    createTask({
      id: "prepare-execution-report",
      title: "Prepare execution report",
      description:
        "Assemble the clarified objective, assumptions, open questions, planned tasks, and implementation recommendation into a single run report.",
      status: DEFAULT_STATUS,
      type: "general",
      dependencies: ["choose-implementation-path", "identify-skills", "validate-risks"],
    }),
  );

  return { tasks };
}

export function buildPlanFromClarification(
  clarification: ClarificationResult,
): Task[] {
  return buildPlan({ clarification }).tasks;
}

export function buildInitialPlan(input: UserInput): PlanTask[] {
  const slug = input.idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";

  const generatedRoot = ".codekit/generated";

  return [
    {
      id: "p1",
      phase: "intake",
      title: "Capture normalized intake",
      description: "Persist intake details for the control plane and future resume flows.",
      doneDefinition: "Intake artifact is generated and readable.",
      taskType: "file-write",
      adapterId: "fs",
      payload: {
        path: path.join(generatedRoot, slug, "00-intake-note.md"),
        content: `# Intake\n\nIdea: ${input.idea}\nMode: ${input.mode}\nDeliverable: ${input.deliverable ?? "app"}\n`,
      },
      retryPolicy: { maxAttempts: 1 },
      rollbackPayload: { path: path.join(generatedRoot, slug, "00-intake-note.md") },
    },
    {
      id: "p2",
      phase: "planning",
      title: "Generate MVP scaffold plan",
      description: "Create a local implementation outline artifact.",
      doneDefinition: "Plan scaffold markdown exists.",
      taskType: "file-write",
      adapterId: "fs",
      payload: {
        path: path.join(generatedRoot, slug, "01-plan.md"),
        content: `# MVP Plan\n\n- Define user journeys\n- Implement core entities\n- Build UI and APIs\n- Add QA and deployment checks\n`,
      },
      retryPolicy: { maxAttempts: 2 },
      rollbackPayload: { path: path.join(generatedRoot, slug, "01-plan.md") },
    },
    {
      id: "p3",
      phase: "execution",
      title: "Prepare workspace command",
      description: "Record or run a safe command for local setup.",
      doneDefinition: "A terminal execution log exists.",
      taskType: "terminal",
      adapterId: "terminal",
      payload: {
        command: "echo",
        args: ["Phase 8 workspace prepared"],
        allowExecution: input.allowCommandExecution ?? false,
      },
      retryPolicy: { maxAttempts: 1 },
    },
    {
      id: "p4",
      phase: "governance",
      title: "Approval checkpoint",
      description: "Pause before high-risk mutations.",
      doneDefinition: "Run pauses for approval when policy requires it.",
      taskType: "approval",
      adapterId: "terminal", // Using terminal as placeholder for approval-compatible logic
      payload: { command: "echo", args: ["Checkpoint reached"] },
      requiresApproval: true,
      retryPolicy: { maxAttempts: 1 },
    },
  ];
}

function createTask(task: Task): Task {
  return {
    ...task,
    status: task.status ?? DEFAULT_STATUS,
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
  };
}

function normalizeCategory(clarification: ClarificationResult): ProjectCategory {
  const source = clarification.inferredProjectType?.toLowerCase() ?? "";

  if (containsAny(source, ["crm", "saas", "platform", "dashboard", "web-app", "app"])) {
    return "web-app";
  }
  if (containsAny(source, ["website", "landing page", "marketing site", "site"])) {
    return "website";
  }
  if (containsAny(source, ["automation", "workflow", "integration", "zap", "process"])) {
    return "automation";
  }
  if (containsAny(source, ["agent", "copilot", "assistant", "multi-agent", "ai-agent", "agent-system"])) {
    return "ai-agent";
  }
  if (containsAny(source, ["api", "backend", "service"])) {
    return "api";
  }

  const normalizedIdea = clarification.normalizedIdea?.toLowerCase() ?? "";
  if (containsAny(normalizedIdea, ["website", "landing page"])) {
    return "website";
  }
  if (containsAny(normalizedIdea, ["automation", "workflow"])) {
    return "automation";
  }
  if (containsAny(normalizedIdea, ["agent", "assistant", "copilot"])) {
    return "ai-agent";
  }
  if (containsAny(normalizedIdea, ["api", "backend"])) {
    return "api";
  }
  if (normalizedIdea) {
    return "web-app";
  }

  return "unknown";
}

function getCompletenessScore(clarification: ClarificationResult): number {
  if (clarification.completeness === "sufficient-for-initial-planning") {
    return 0.9;
  }

  const assumptions = clarification.assumptions || [];
  const questions = clarification.clarifyingQuestions || [];

  let score = 0.5;
  score += Math.min(assumptions.length, 4) * 0.08;
  score -= Math.min(questions.length, 5) * 0.06;

  return clamp(score, 0, 1);
}

function buildClarificationDescription(
  clarification: ClarificationResult,
  completeness: number,
): string {
  const objective = clarification.normalizedIdea || "Unspecified objective";
  const questionCount = (clarification.clarifyingQuestions || []).length;

  if (questionCount === 0 && completeness >= 0.8) {
    return `Objective is already fairly well defined: ${objective}. Confirm acceptance criteria, MVP boundary, and delivery priorities before execution.`;
  }

  return `Refine the project objective (${objective}) and resolve the remaining ${questionCount} open clarification item(s) before deeper implementation planning.`;
}

function buildArchitectureDescription(category: ProjectCategory): string {
  switch (category) {
    case "web-app":
      return "Define frontend, backend, data model, user roles, and deployment boundaries for the application.";
    case "website":
      return "Define page structure, content model, CMS needs, analytics, and hosting/deployment approach for the site.";
    case "automation":
      return "Map triggers, actions, systems, data handoffs, failure paths, and operational ownership for the automation.";
    case "ai-agent":
      return "Define agent boundaries, tools, workflows, memory behavior, escalation points, and evaluation approach.";
    case "api":
      return "Define service boundaries, endpoints, authentication, data contracts, and deployment/runtime assumptions.";
    default:
      return "Define the core system shape, main components, interfaces, and delivery boundaries.";
  }
}

function buildRiskDescription(
  category: ProjectCategory,
  clarification: ClarificationResult,
): string {
  const questionCount = (clarification.clarifyingQuestions || []).length;
  const base = questionCount > 0
    ? `Review unresolved clarification items (${questionCount}) and identify delivery risks created by missing inputs.`
    : "Review scope, dependencies, and delivery assumptions for hidden implementation risk.";

  switch (category) {
    case "automation":
      return `${base} Pay special attention to integration reliability, auth, retries, and error recovery.`;
    case "ai-agent":
      return `${base} Pay special attention to tool safety, hallucination boundaries, memory scope, and evaluation.`;
    case "website":
      return `${base} Pay special attention to content readiness, SEO, analytics, and publication workflow.`;
    case "web-app":
      return `${base} Pay special attention to data model drift, role complexity, and multi-user workflows.`;
    case "api":
      return `${base} Pay special attention to auth, versioning, service dependencies, and contract stability.`;
    default:
      return base;
  }
}

function getCategoryTasks(category: ProjectCategory): Task[] {
  switch (category) {
    case "website":
      return [
        createTask({
          id: "design-content-structure",
          title: "Design page and content structure",
          description:
            "Outline the required pages, sections, messaging flow, calls to action, and supporting content needed for launch.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "plan-launch-analytics",
          title: "Plan launch, analytics, and publishing setup",
          description:
            "Define analytics, forms, SEO basics, deployment flow, and go-live readiness for the website.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["design-content-structure", "validate-risks"],
        }),
      ];
    case "automation":
      return [
        createTask({
          id: "map-workflow-systems",
          title: "Map workflow triggers and connected systems",
          description:
            "Document the start conditions, external systems, data movement, transformation rules, and ownership of each step.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "define-failure-handling",
          title: "Define failure handling and observability",
          description:
            "Specify retry logic, fallbacks, alerting, manual overrides, and audit visibility for the automation flow.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["map-workflow-systems", "validate-risks"],
        }),
      ];
    case "ai-agent":
      return [
        createTask({
          id: "define-agent-workflows",
          title: "Define agent workflows and tool boundaries",
          description:
            "Specify what the agent can do, which tools it may use, where it must ask for confirmation, and how handoffs occur.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "design-evaluation-safety",
          title: "Design evaluation and safety checks",
          description:
            "Define how the agent output will be reviewed, measured, and constrained before broader rollout.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["define-agent-workflows", "validate-risks"],
        }),
      ];
    case "api":
      return [
        createTask({
          id: "define-api-contracts",
          title: "Define API contracts and auth approach",
          description:
            "Outline resources, endpoints, request/response contracts, auth model, and key non-functional requirements.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["clarify-scope", "define-architecture"],
        }),
      ];
    case "web-app":
      return [
        createTask({
          id: "design-core-user-flows",
          title: "Design core user flows and data model",
          description:
            "Define the primary user journeys, system entities, permissions, and essential application workflows.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "plan-delivery-slices",
          title: "Plan delivery slices and MVP sequence",
          description:
            "Break the application into practical vertical slices for implementation, testing, and staged rollout.",
          status: DEFAULT_STATUS,
          type: "planning",
          dependencies: ["design-core-user-flows", "validate-risks"],
        }),
      ];
    default:
      return [];
  }
}

function getImplementationDependencies(category: ProjectCategory): string[] {
  const common = ["identify-skills", "validate-risks"];

  switch (category) {
    case "website":
      return ["design-content-structure", "plan-launch-analytics", ...common];
    case "automation":
      return ["map-workflow-systems", "define-failure-handling", ...common];
    case "ai-agent":
      return ["define-agent-workflows", "design-evaluation-safety", ...common];
    case "api":
      return ["define-api-contracts", ...common];
    case "web-app":
      return ["design-core-user-flows", "plan-delivery-slices", ...common];
    default:
      return ["identify-skills", "validate-risks"];
  }
}

function containsAny(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
