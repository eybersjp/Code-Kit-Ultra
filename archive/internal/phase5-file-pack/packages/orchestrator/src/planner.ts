import type {
  ClarificationResult,
  Task,
  TaskStatus,
} from "../../shared/src";

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
      status: completeness >= 0.8 ? "in-progress" : DEFAULT_STATUS,
      dependencies: [],
    }),
  );

  tasks.push(
    createTask({
      id: "define-architecture",
      title: "Define architecture and system boundaries",
      description: buildArchitectureDescription(category),
      status: DEFAULT_STATUS,
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
      dependencies: ["define-architecture"],
    }),
  );

  tasks.push(
    createTask({
      id: "validate-risks",
      title: "Validate risks, dependencies, and constraints",
      description: buildRiskDescription(category, clarification),
      status: DEFAULT_STATUS,
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

function createTask(task: Task): Task {
  return {
    ...task,
    status: task.status ?? DEFAULT_STATUS,
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
  };
}

function normalizeCategory(clarification: ClarificationResult): ProjectCategory {
  const candidates = [
    readString(clarification, ["projectType", "category", "solutionCategory", "type"]),
    readString(readObject(clarification, ["classification", "signals"]), [
      "projectType",
      "category",
      "solutionCategory",
      "type",
    ]),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const joined = candidates.join(" ");

  if (containsAny(joined, ["crm", "saas", "platform", "dashboard", "web app", "app"])) {
    return "web-app";
  }
  if (containsAny(joined, ["landing page", "website", "marketing site", "site"])) {
    return "website";
  }
  if (containsAny(joined, ["automation", "workflow", "integration", "zap", "process"])) {
    return "automation";
  }
  if (containsAny(joined, ["agent", "copilot", "assistant", "multi-agent", "ai system"])) {
    return "ai-agent";
  }
  if (containsAny(joined, ["api", "backend", "service"])) {
    return "api";
  }

  const normalizedObjective = readString(clarification, ["normalizedObjective", "objective"])?.toLowerCase() ?? "";
  if (containsAny(normalizedObjective, ["website", "landing page"])) {
    return "website";
  }
  if (containsAny(normalizedObjective, ["automation", "workflow"])) {
    return "automation";
  }
  if (containsAny(normalizedObjective, ["agent", "assistant", "copilot"])) {
    return "ai-agent";
  }
  if (containsAny(normalizedObjective, ["api", "backend"])) {
    return "api";
  }
  if (normalizedObjective) {
    return "web-app";
  }

  return "unknown";
}

function getCompletenessScore(clarification: ClarificationResult): number {
  const explicit = readNumber(clarification, ["completeness", "confidence", "readinessScore"]);
  if (typeof explicit === "number") {
    return clamp(explicit, 0, 1);
  }

  const assumptions = readArray(clarification, ["assumptions"]);
  const questions = readArray(clarification, ["clarifyingQuestions", "questions"]);
  const objective = readString(clarification, ["normalizedObjective", "objective"]);

  let score = objective ? 0.5 : 0.2;
  score += Math.min(assumptions.length, 4) * 0.08;
  score -= Math.min(questions.length, 5) * 0.06;

  return clamp(score, 0, 1);
}

function buildClarificationDescription(
  clarification: ClarificationResult,
  completeness: number,
): string {
  const objective = readString(clarification, ["normalizedObjective", "objective"]) ?? "Unspecified objective";
  const questionCount = readArray(clarification, ["clarifyingQuestions", "questions"]).length;

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
  const questionCount = readArray(clarification, ["clarifyingQuestions", "questions"]).length;
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
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "plan-launch-analytics",
          title: "Plan launch, analytics, and publishing setup",
          description:
            "Define analytics, forms, SEO basics, deployment flow, and go-live readiness for the website.",
          status: DEFAULT_STATUS,
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
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "define-failure-handling",
          title: "Define failure handling and observability",
          description:
            "Specify retry logic, fallbacks, alerting, manual overrides, and audit visibility for the automation flow.",
          status: DEFAULT_STATUS,
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
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "design-evaluation-safety",
          title: "Design evaluation and safety checks",
          description:
            "Define how the agent output will be reviewed, measured, and constrained before broader rollout.",
          status: DEFAULT_STATUS,
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
          dependencies: ["clarify-scope", "define-architecture"],
        }),
        createTask({
          id: "plan-delivery-slices",
          title: "Plan delivery slices and MVP sequence",
          description:
            "Break the application into practical vertical slices for implementation, testing, and staged rollout.",
          status: DEFAULT_STATUS,
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

function readString(source: unknown, keys: string[]): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function readNumber(source: unknown, keys: string[]): number | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function readObject(
  source: unknown,
  keys: string[],
): Record<string, unknown> | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return undefined;
}

function readArray(source: unknown, keys: string[]): unknown[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}
