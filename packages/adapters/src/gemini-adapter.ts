import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 90; // High for Google-specific tech (GCP, Angular, etc.) or broad-context reasoning.

  if (input.preferredAction === "plan") score += 10;
  if (/(google|gcp|firebase|cloud|bigquery|analytics)/.test(idea)) score += 20;

  return Math.min(score, 100);
}

export const geminiAdapter: PlatformAdapter = {
  id: "gemini",
  name: "Google Gemini 1.5 Pro",
  capabilities: ["planning", "scaffolding", "code-editing", "refactoring", "repo-navigation"],

  canHandle(): boolean {
    return true; // Assume available
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "gemini",
      adapterName: "Gemini",
      fitScore,
      recommended: fitScore >= 90,
      reason:
        fitScore >= 90
          ? "Exceptional when deep context across numerous files is needed, or if integrating with GCP/Google services."
          : "Excellent choice for multi-modal context but can be overkill for very small edits.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "gemini",
      adapterName: "Gemini",
      accepted: this.canHandle(input),
      mockAction: "Reason across broad codebase context with 1M+ token window via Vertex AI.",
      summary: `Gemini would analyze existing repo context for: ${input.projectIdea}`,
      nextSteps: [
        "Index relevant folders to provide broad-context retrieval.",
        "Perform architectural cross-referencing for dependency mapping.",
        "Generate cross-module refactoring plan.",
      ],
    };
  },
};
