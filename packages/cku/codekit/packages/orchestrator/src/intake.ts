import type { ClarificationResult, Mode } from "../../shared/src";
import { trimQuestionsByMode } from "./mode-controller";

export interface IntakeInput {
  idea: string;
  mode?: Mode;
}

export interface IntakeSignals {
  mode: Mode;
  rawIdeaLength: number;
  inferredCategory: string;
}

export type SolutionCategory = "web-app" | "website" | "automation" | "ai-agent" | "api" | "unknown";

export function normalizeIdeaText(idea: string): string {
  return idea.trim().replace(/\s+/g, " ");
}

export function inferSolutionCategory(idea: string): SolutionCategory {
  const text = idea.toLowerCase();

  if (/(crm|platform|portal|dashboard|app|saas)/.test(text)) return "web-app";
  if (/(landing page|website|homepage|marketing site)/.test(text)) return "website";
  if (/(automation|automate|workflow|zapier|make\.com|n8n|reminder)/.test(text)) return "automation";
  if (/(agent|triage|tool-using|assistant system|autonomous)/.test(text)) return "ai-agent";
  if (/(api|backend|endpoint|microservice)/.test(text)) return "api";

  return "unknown";
}

export function deriveAssumptions(category: SolutionCategory): Array<{ id: string; text: string; confidence: "low" | "medium" | "high" }> {
  const base = [
    { id: "assumption-mvp", text: "Interpreting this request as a vertical slice or MVP scope.", confidence: "medium" as const },
  ];

  if (category === "website") {
    return [
      ...base,
      { id: "assumption-browser", text: "Assuming a web-first responsive experience.", confidence: "high" as const },
      { id: "assumption-content", text: "Assuming content assets are provided or can be generated.", confidence: "medium" as const },
    ];
  }

  if (category === "web-app") {
    return [
      ...base,
      { id: "assumption-auth", text: "Assuming the need for authentication and multi-user access.", confidence: "medium" as const },
      { id: "assumption-db", text: "Assuming a relational data model is required.", confidence: "high" as const },
    ];
  }

  if (category === "automation") {
    return [
      ...base,
      { id: "assumption-integration", text: "Assuming the use of third-party APIs for coordination.", confidence: "high" as const },
      { id: "assumption-error-handling", text: "Assuming standard failure notification requirements.", confidence: "medium" as const },
    ];
  }

  return base;
}

export function generateClarifyingQuestions(category: SolutionCategory): Array<{ id: string; text: string; blocking: boolean; priority?: "critical" | "high" | "medium" | "low" }> {
  const common = [
    { id: "question-scope", text: "What is the primary success metric for this phase?", blocking: false, priority: "high" as const },
    { id: "question-target-audience", text: "Who are the primary end-users?", blocking: false, priority: "medium" as const },
  ];

  if (category === "web-app") {
    return [
      { id: "question-rbac", text: "Do you have specific role-based access requirements?", blocking: true, priority: "critical" as const },
      ...common,
      { id: "question-data-volume", text: "What is the expected data volume for this system?", blocking: false, priority: "low" as const },
    ];
  }

  if (category === "website") {
    return [
      { id: "question-domain", text: "Do you have a preferred domain or hosting provider?", blocking: false, priority: "low" as const },
      ...common,
      { id: "question-cta", text: "What is the main call to action for the landing page?", blocking: true, priority: "high" as const },
    ];
  }

  return [
    { id: "question-missing-reqs", text: "Are there any specific constraints we must follow?", blocking: false, priority: "medium" as const },
    ...common,
  ];
}

export function deriveIntakeSignals(idea: string, mode: Mode, category: SolutionCategory): IntakeSignals {
  return {
    mode,
    rawIdeaLength: idea.length,
    inferredCategory: category,
  };
}

export function runIntake(input: IntakeInput): ClarificationResult {
  const mode = input.mode ?? "builder";
  const normalizedIdea = normalizeIdeaText(input.idea);
  const category = inferSolutionCategory(normalizedIdea);

  const assumptions = deriveAssumptions(category);
  const rawQuestions = generateClarifyingQuestions(category);
  const clarifyingQuestions = trimQuestionsByMode(rawQuestions, mode);

  return {
    normalizedIdea,
    inferredProjectType: category,
    assumptions,
    clarifyingQuestions,
    completeness: clarifyingQuestions.filter(q => q.blocking).length > 0 ? "needs-clarification" : "sufficient-for-initial-planning",
  };
}
