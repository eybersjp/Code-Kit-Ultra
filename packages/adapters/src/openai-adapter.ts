import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 80; // High default for OpenAI global knowledge

  if (input.preferredAction === "plan") score += 10;
  if (input.preferredAction === "generate-files") score += 10;
  if (/(modern|react|nextjs|api|backend|fullstack)/.test(idea)) score += 5;

  return Math.min(score, 100);
}

export const openaiAdapter: PlatformAdapter = {
  id: "openai",
  name: "OpenAI (GPT-4o)",
  capabilities: ["planning", "scaffolding", "code-editing", "refactoring", "fullstack-build"],

  canHandle(): boolean {
    return true; // Assume always available if API key provided
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "openai",
      adapterName: "OpenAI",
      fitScore,
      recommended: fitScore >= 85,
      reason:
        fitScore >= 85
          ? "Excellent for broad structural planning and generating high-quality boilerplate across diverse stacks."
          : "Highly capable general-purpose model, though specialized tools may offer more narrow context focus.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "openai",
      adapterName: "OpenAI",
      accepted: this.canHandle(input),
      mockAction: "Generate comprehensive project structure via GPT-4o API.",
      summary: `OpenAI would architect and scaffold the project for: ${input.projectIdea}`,
      nextSteps: [
        "Construct a detailed system prompt with project boundaries.",
        "Request a structured JSON output of files and directories.",
        "Validate generated schema against security policies.",
      ],
    };
  },
};
