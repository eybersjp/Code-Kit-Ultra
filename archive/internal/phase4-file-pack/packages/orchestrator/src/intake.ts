import type {
  Assumption,
  ClarificationResult,
  ClarifyingQuestion,
  Mode,
  UserInput,
} from "../../shared/src";

export type SolutionCategory =
  | "app"
  | "website"
  | "automation"
  | "agent-system"
  | "docs"
  | "internal-tool"
  | "unknown";

export interface IntakeSignals {
  normalizedIdea: string;
  category: SolutionCategory;
  hasAudience: boolean;
  hasPlatformPreference: boolean;
  hasTechPreference: boolean;
  hasAuthSignals: boolean;
  hasDeliveryStageSignals: boolean;
  hasBusinessModelSignals: boolean;
  hasMobileSignals: boolean;
}

const AUDIENCE_PATTERNS = [
  /for\s+[a-z0-9-]/i,
  /team/i,
  /teams/i,
  /users/i,
  /customers?/i,
  /admins?/i,
  /sales/i,
  /project managers?/i,
  /installers?/i,
  /developers?/i,
  /operators?/i,
];

const WEBSITE_PATTERNS = [/website/i, /landing page/i, /marketing site/i, /brochure site/i];
const AUTOMATION_PATTERNS = [/automation/i, /workflow/i, /pipeline/i, /sync/i, /integrat/i];
const AGENT_PATTERNS = [/agent/i, /multi-agent/i, /ai system/i, /autonomous/i, /copilot/i];
const DOCS_PATTERNS = [/docs?/i, /documentation/i, /spec/i, /playbook/i, /guide/i];
const INTERNAL_TOOL_PATTERNS = [/internal tool/i, /ops tool/i, /back office/i, /admin portal/i];
const APP_PATTERNS = [/app/i, /platform/i, /crm/i, /erp/i, /dashboard/i, /portal/i, /saas/i];

const PLATFORM_PATTERNS = [
  /web/i,
  /mobile/i,
  /ios/i,
  /android/i,
  /desktop/i,
  /responsive/i,
  /browser/i,
];

const TECH_PATTERNS = [
  /react/i,
  /next/i,
  /typescript/i,
  /node/i,
  /python/i,
  /firebase/i,
  /supabase/i,
  /postgres/i,
  /mysql/i,
  /mongodb/i,
];

const AUTH_PATTERNS = [/auth/i, /login/i, /roles?/i, /permissions?/i, /users?/i];
const DELIVERY_STAGE_PATTERNS = [/mvp/i, /production/i, /deploy/i, /launch/i, /prototype/i, /pilot/i];
const BUSINESS_MODEL_PATTERNS = [/saas/i, /commercial/i, /client/i, /internal/i, /enterprise/i];
const MOBILE_PATTERNS = [/mobile/i, /ios/i, /android/i, /tablet/i];

export function normalizeIdeaText(rawIdea: string): string {
  return rawIdea.replace(/\s+/g, " ").trim();
}

export function inferSolutionCategory(input: UserInput): SolutionCategory {
  const haystack = buildSearchText(input);

  if (matchesAny(haystack, INTERNAL_TOOL_PATTERNS)) {
    return "internal-tool";
  }

  if (matchesAny(haystack, WEBSITE_PATTERNS)) {
    return "website";
  }

  if (matchesAny(haystack, AUTOMATION_PATTERNS)) {
    return "automation";
  }

  if (matchesAny(haystack, AGENT_PATTERNS)) {
    return "agent-system";
  }

  if (matchesAny(haystack, DOCS_PATTERNS)) {
    return "docs";
  }

  if (matchesAny(haystack, APP_PATTERNS)) {
    return "app";
  }

  return "unknown";
}

export function deriveIntakeSignals(input: UserInput): IntakeSignals {
  const normalizedIdea = normalizeIdeaText(input.idea ?? "");
  const haystack = buildSearchText({ ...input, idea: normalizedIdea });

  return {
    normalizedIdea,
    category: inferSolutionCategory({ ...input, idea: normalizedIdea }),
    hasAudience: matchesAny(haystack, AUDIENCE_PATTERNS),
    hasPlatformPreference: matchesAny(haystack, PLATFORM_PATTERNS),
    hasTechPreference: matchesAny(haystack, TECH_PATTERNS),
    hasAuthSignals: matchesAny(haystack, AUTH_PATTERNS),
    hasDeliveryStageSignals: matchesAny(haystack, DELIVERY_STAGE_PATTERNS),
    hasBusinessModelSignals: matchesAny(haystack, BUSINESS_MODEL_PATTERNS),
    hasMobileSignals: matchesAny(haystack, MOBILE_PATTERNS),
  };
}

export function deriveAssumptions(input: UserInput): Assumption[] {
  const signals = deriveIntakeSignals(input);
  const assumptions: Assumption[] = [];

  assumptions.push(
    createAssumption(
      "a1",
      `Interpreting this request as a ${signals.category === "unknown" ? "software" : signals.category} build unless clarified otherwise.`,
      "medium",
    ),
  );

  if (!signals.hasPlatformPreference && !signals.hasMobileSignals) {
    assumptions.push(
      createAssumption(
        "a2",
        "Assuming a web-first responsive experience unless mobile or desktop is explicitly required.",
        "medium",
      ),
    );
  }

  if (!signals.hasAudience) {
    assumptions.push(
      createAssumption(
        "a3",
        "Assuming the first deliverable should be structured around one or more business user roles.",
        "low",
      ),
    );
  }

  if (!signals.hasDeliveryStageSignals) {
    assumptions.push(
      createAssumption(
        "a4",
        "Assuming the immediate target is an MVP or first vertical slice rather than a full enterprise rollout.",
        "medium",
      ),
    );
  }

  if (!signals.hasTechPreference) {
    assumptions.push(
      createAssumption(
        "a5",
        "Assuming the stack can be recommended later instead of being fixed at intake time.",
        "medium",
      ),
    );
  }

  return assumptions;
}

export function generateClarifyingQuestions(input: UserInput): ClarifyingQuestion[] {
  const signals = deriveIntakeSignals(input);
  const questions: ClarifyingQuestion[] = [];

  if (!signals.hasAudience) {
    questions.push(
      createQuestion(
        "q1",
        "Who are the main users or roles for this solution?",
        true,
      ),
    );
  }

  if (!signals.hasBusinessModelSignals) {
    questions.push(
      createQuestion(
        "q2",
        "Is this an internal tool, a client-specific solution, or a commercial SaaS product?",
        true,
      ),
    );
  }

  if (!signals.hasPlatformPreference) {
    questions.push(
      createQuestion(
        "q3",
        "Should this be web, mobile, desktop, or a multi-platform solution?",
        false,
      ),
    );
  }

  if (!signals.hasTechPreference) {
    questions.push(
      createQuestion(
        "q4",
        "Do you want the system to recommend the stack, or do you already have a preferred stack?",
        false,
      ),
    );
  }

  if (!signals.hasAuthSignals && signals.category !== "docs") {
    questions.push(
      createQuestion(
        "q5",
        "Will this need authentication, multiple users, and role-based access?",
        false,
      ),
    );
  }

  if (!signals.hasDeliveryStageSignals) {
    questions.push(
      createQuestion(
        "q6",
        "Should the first pass stop at planning and scaffolding, or should it prepare for production deployment too?",
        false,
      ),
    );
  }

  return questions;
}

export function runIntake(input: UserInput): ClarificationResult {
  const normalizedIdea = normalizeIdeaText(input.idea ?? "");
  const normalizedInput: UserInput = {
    ...input,
    idea: normalizedIdea,
    mode: normalizeMode(input.mode),
  };

  const signals = deriveIntakeSignals(normalizedInput);
  const assumptions = deriveAssumptions(normalizedInput);
  const clarifyingQuestions = generateClarifyingQuestions(normalizedInput);

  return {
    normalizedIdea,
    inferredProjectType: signals.category,
    assumptions,
    clarifyingQuestions,
    completeness:
      clarifyingQuestions.filter((question) => isBlockingQuestion(question)).length === 0
        ? "sufficient-for-initial-planning"
        : "needs-clarification",
  } as ClarificationResult;
}

function buildSearchText(input: Partial<UserInput>): string {
  const values = [
    input.idea,
    typeof input.deliverable === "string" ? input.deliverable : "",
    typeof input.priority === "string" ? input.priority : "",
    typeof input.skillLevel === "string" ? input.skillLevel : "",
  ];

  return values.filter((value): value is string => typeof value === "string").join(" ");
}

function matchesAny(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

function normalizeMode(mode: Mode | undefined): Mode {
  return mode === "safe" || mode === "balanced" || mode === "god"
    ? mode
    : "balanced";
}

function createAssumption(
  id: string,
  text: string,
  confidence: "low" | "medium" | "high",
): Assumption {
  return {
    id,
    text,
    confidence,
  } as Assumption;
}

function createQuestion(id: string, text: string, blocking: boolean): ClarifyingQuestion {
  return {
    id,
    text,
    blocking,
  } as ClarifyingQuestion;
}

function isBlockingQuestion(question: ClarifyingQuestion): boolean {
  return Boolean((question as { blocking?: boolean }).blocking);
}
