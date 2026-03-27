import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 50;

  if (input.preferredAction === "ship-mvp") score += 30;
  if (input.preferredAction === "generate-files") score += 15;
  if (/(fullstack|dashboard|app|portal|saas|frontend|backend|mvp)/.test(idea)) score += 20;
  if (/(website|platform|crm)/.test(idea)) score += 10;

  return Math.min(score, 100);
}

export const windsurfAdapter: PlatformAdapter = {
  id: "windsurf",
  name: "Windsurf",
  capabilities: ["fullstack-build", "contextual-iteration", "code-editing", "scaffolding"],

  canHandle(): boolean {
    return true;
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "windsurf",
      adapterName: "Windsurf",
      fitScore,
      recommended: fitScore >= 70,
      reason:
        fitScore >= 70
          ? "Strong fit for full-stack momentum, MVP generation, and context-rich implementation loops."
          : "Useful for broader app building, but may be less ideal for pure planning or narrow refactor work.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "windsurf",
      adapterName: "Windsurf",
      accepted: this.canHandle(input),
      mockAction: "Drive an MVP-oriented implementation loop across app layers.",
      summary: `Windsurf would push toward a buildable MVP for: ${input.projectIdea}`,
      nextSteps: [
        "Map the MVP scope into screens, APIs, and core flows.",
        "Generate or refine implementation files across the stack.",
        "Iterate until the primary user journey is working end to end.",
      ],
    };
  },
};
