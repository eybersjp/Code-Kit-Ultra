import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 95; // High for coding reasoning (Claude 3.5 Sonnet is top tier).

  if (input.preferredAction === "refactor") score += 5;
  if (input.preferredAction === "review-repo") score += 5;
  if (/(rust|go|c\+\+|embedded|low-level|math|algorithm)/.test(idea)) score += 10;

  return Math.min(score, 100);
}

export const claudeAdapter: PlatformAdapter = {
  id: "claude",
  name: "Anthropic Claude 3.5 Sonnet",
  capabilities: ["planning", "scaffolding", "code-editing", "refactoring", "contextual-iteration"],

  canHandle(): boolean {
    return true; // Assume available
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "claude",
      adapterName: "Claude",
      fitScore,
      recommended: fitScore >= 95,
      reason:
        fitScore >= 95
          ? "Industry-leading reasoning and precision for complex code tasks, algorithms, and logical refactors."
          : "Highly performant across all dimensions, generally preferred for deep reasoning.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "claude",
      adapterName: "Claude",
      accepted: this.canHandle(input),
      mockAction: "Perform precise code generation and reasoning via Anthropic API.",
      summary: `Claude would perform high-precision logic implementation for: ${input.projectIdea}`,
      nextSteps: [
        "Create a system prompt focused on strict coding style and correctness.",
        "Provide relevant code samples in context for Sonnet-level refinement.",
        "Request detailed commentary for reasoning audit.",
      ],
    };
  },
};
