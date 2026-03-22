import type {
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

function computeFitScore(input: AdapterExecutionRequest): number {
  const idea = input.projectIdea.toLowerCase();
  let score = 45;

  if (input.preferredAction === "refactor") score += 30;
  if (input.preferredAction === "review-repo") score += 20;
  if (/(fix|edit|refactor|typescript|monorepo|bug|cli|package)/.test(idea)) score += 20;
  if (/(repo|code|files)/.test(idea)) score += 10;

  return Math.min(score, 100);
}

export const cursorAdapter: PlatformAdapter = {
  id: "cursor",
  name: "Cursor",
  capabilities: ["code-editing", "refactoring", "repo-navigation", "contextual-iteration"],

  canHandle(): boolean {
    return true;
  },

  recommend(input: AdapterExecutionRequest): AdapterRecommendation {
    const fitScore = computeFitScore(input);

    return {
      adapterId: "cursor",
      adapterName: "Cursor",
      fitScore,
      recommended: fitScore >= 70,
      reason:
        fitScore >= 70
          ? "Strong fit for targeted file edits, iterative refactors, and code-aware repo work."
          : "Helpful for code iteration, but less ideal when the main need is broad planning or scaffolding.",
      capabilities: this.capabilities,
    };
  },

  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult {
    return {
      adapterId: "cursor",
      adapterName: "Cursor",
      accepted: this.canHandle(input),
      mockAction: "Apply focused file changes and iterate against local context.",
      summary: `Cursor would handle incremental code edits for: ${input.projectIdea}`,
      nextSteps: [
        "Open the affected files and inspect current implementations.",
        "Apply targeted edits with minimal surface-area changes.",
        "Run typecheck and fix local regressions.",
      ],
    };
  },
};
