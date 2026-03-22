import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 50;

  if (input.preferredAction === "plan") score += 25;
  if (input.preferredAction === "generate-files") score += 15;
  if (/(architecture|system|workflow|prompt|pack|scaffold|repo)/.test(idea)) score += 20;
  if (/(agent|automation|platform)/.test(idea)) score += 10;

  return Math.min(score, 100);
}

export const antigravityAdapter: PlatformAdapter = {
  id: "antigravity",
  name: "Antigravity",
  capabilities: ["planning", "scaffolding", "prompt-driven-build", "repo-navigation"],

  canHandle(): boolean {
    return true;
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "antigravity",
      adapterName: "Antigravity",
      fitScore,
      recommended: fitScore >= 70,
      reason:
        fitScore >= 70
          ? "Strong fit for structured planning, repo scaffolding, and prompt-driven build phases."
          : "Usable for planning-heavy work, but not always the strongest coding surface for tight file iteration.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "antigravity",
      adapterName: "Antigravity",
      accepted: this.canHandle(input),
      mockAction: "Generate a structured implementation pack and execution prompts.",
      summary: `Antigravity would turn the request into a governed prompt pack for: ${input.projectIdea}`,
      nextSteps: [
        "Inspect the repo structure and current phase state.",
        "Produce a file-by-file implementation plan.",
        "Generate full file contents for the selected phase.",
      ],
    };
  },
};
