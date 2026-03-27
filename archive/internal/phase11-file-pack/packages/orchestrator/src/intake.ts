import type { ClarificationResult, Mode } from "../../shared/src";
import { trimQuestionsByMode } from "./mode-controller";

export interface IntakeInput {
  idea: string;
  mode?: Mode;
}

function normalizeIdea(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function inferProjectType(idea: string): string {
  const text = idea.toLowerCase();

  if (/(landing page|website|homepage|marketing site)/.test(text)) return "website";
  if (/(automation|automate|workflow|zapier|make\.com|n8n|reminder)/.test(text)) return "automation";
  if (/(agent|triage|tool-using|assistant system|autonomous)/.test(text)) return "agent-system";
  if (/(api|backend|endpoint|microservice)/.test(text)) return "api";
  if (/(crm|platform|portal|dashboard|app|saas)/.test(text)) return "web-app";

  return "general-software";
}

function buildAssumptions(projectType: string): Array<any> {
  const shared = [
    { id: "assumption-1", text: "The first delivery should target an MVP scope.", confidence: "medium" },
  ];

  if (projectType === "website") {
    return [
      ...shared,
      { id: "assumption-2", text: "The solution is browser-based.", confidence: "high" },
      { id: "assumption-3", text: "Content structure and conversion goals matter.", confidence: "medium" },
    ];
  }

  if (projectType === "automation") {
    return [
      ...shared,
      { id: "assumption-2", text: "The workflow will integrate with at least one external system.", confidence: "high" },
      { id: "assumption-3", text: "Triggers, actions, and failure handling must be mapped.", confidence: "high" },
    ];
  }

  if (projectType === "agent-system") {
    return [
      ...shared,
      { id: "assumption-2", text: "The system may need tool access or workflow execution boundaries.", confidence: "medium" },
      { id: "assumption-3", text: "Evaluation and guardrails will be required.", confidence: "high" },
    ];
  }

  return [
    ...shared,
    { id: "assumption-2", text: "The solution is likely a browser-based multi-screen product.", confidence: "medium" },
    { id: "assumption-3", text: "User roles and data model will affect architecture choices.", confidence: "medium" },
  ];
}

function buildQuestions(projectType: string): Array<any> {
  const common = [
    { id: "question-scope", text: "Should this be MVP-focused or closer to production scope?", priority: "high", required: true },
    { id: "question-users", text: "Who are the primary user roles for this system?", priority: "high", required: true },
  ];

  if (projectType === "website") {
    return [
      ...common,
      { id: "question-brand", text: "Do you already have brand copy, visuals, and a clear call to action?", priority: "medium" },
      { id: "question-stack", text: "Should the system recommend a web stack or follow an existing preference?", priority: "medium" },
      { id: "question-hosting", text: "Is there a preferred hosting or deployment target?", priority: "low" },
    ];
  }

  if (projectType === "automation") {
    return [
      ...common,
      { id: "question-systems", text: "Which systems must the automation connect to?", priority: "critical", required: true },
      { id: "question-trigger", text: "What event should trigger the automation?", priority: "high" },
      { id: "question-failure", text: "What should happen when the automation fails or data is incomplete?", priority: "high" },
      { id: "question-volume", text: "What is the expected run volume and time sensitivity?", priority: "medium" },
    ];
  }

  if (projectType === "agent-system") {
    return [
      ...common,
      { id: "question-boundary", text: "What tasks should the agent be allowed to perform autonomously?", priority: "critical", required: true },
      { id: "question-tools", text: "Which tools, data sources, or systems should the agent access?", priority: "high" },
      { id: "question-review", text: "Which actions require human review or approval?", priority: "high" },
      { id: "question-eval", text: "How should the agent be evaluated for correctness and safety?", priority: "medium" },
    ];
  }

  return [
    ...common,
    { id: "question-platform", text: "Do you want web, mobile, desktop, or a hybrid delivery model?", priority: "medium" },
    { id: "question-stack", text: "Do you have a preferred stack, or should the system recommend one?", priority: "medium" },
    { id: "question-data", text: "What are the key entities or records this product must manage?", priority: "high" },
  ];
}

export function runIntake(input: IntakeInput): ClarificationResult {
  const normalizedObjective = normalizeIdea(input.idea);
  const inferredProjectType = inferProjectType(normalizedObjective);
  const assumptions = buildAssumptions(inferredProjectType);
  const clarifyingQuestions = trimQuestionsByMode(buildQuestions(inferredProjectType), input.mode ?? "balanced");

  const completenessScore = Math.max(0, 100 - clarifyingQuestions.length * 10);

  return {
    normalizedObjective,
    inferredProjectType,
    assumptions,
    clarifyingQuestions,
    completenessScore,
    signals: {
      mode: input.mode ?? "balanced",
      rawIdeaLength: normalizedObjective.length,
    },
  } as ClarificationResult;
}
