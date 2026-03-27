import type { AgentContext, AgentResult } from "./types";
import { SYSTEM_PROMPTS } from "./prompts";

export async function runAgentPrompt(agent: string, context: AgentContext): Promise<AgentResult> {
  const systemPrompt = SYSTEM_PROMPTS[agent as keyof typeof SYSTEM_PROMPTS];

  // In a real implementation, this would call an LLM with the context and systemPrompt.
  // For the 'full phase executor' build step, we produce realistic-looking artifacts.

  const phaseDetails: Record<string, { summary: string, payload: any }> = {
    init: {
      summary: "Project initialization and intake complete.",
      payload: { initialization_status: "success", initial_state: "validated" }
    },
    clarify: {
      summary: "Removed ambiguity from the original idea.",
      payload: { refined_idea: context.idea, constraints_identified: ["no_cost", "low_latency"], assumptions: ["single_user"] }
    },
    plan: {
      summary: "High-level execution plan generated.",
      payload: {
        milestones: [
          { name: "Scaffolding", steps: ["Init repo", "Setup deps"] },
          { name: "Core Features", steps: ["Persistence", "Phase execution"] }
        ],
        timeline_estimate: "2 hours"
      }
    },
    architecture: {
      summary: "System architecture defined.",
      payload: { components: ["RunStore", "ExecutionCoordinator", "AgentRegistry"], data_flow: "Linear Phase Progression" }
    },
    build: {
      summary: "Implementation artifact generated.",
      payload: { generated_files: ["packages/core/src/run-store.ts", "packages/orchestrator/src/execution-coordinator.ts"] }
    },
    review: {
      summary: "Quality inspection finished.",
      payload: { feedback: "Code follows monorepo structure. Type safety looks solid.", status: "approved" }
    },
    qa: {
      summary: "Tests verified and quality gate passed.",
      payload: { test_results: "smoke tests passed", coverage: "80%" }
    },
    report: {
      summary: "Final execution report compiled.",
      payload: { execution_success: true, phases_completed: Object.keys(context.priorOutputs) }
    }
  };

  const detail = phaseDetails[context.phase] || {
    summary: `Synthetic ${agent} output generated for ${context.phase}.`,
    payload: { generic_payload: true, phase: context.phase }
  };

  return {
    agent: agent as AgentResult["agent"],
    phase: context.phase,
    summary: detail.summary,
    payload: detail.payload,
    recommendations: [`Finalize ${context.phase} dependencies`, `Prepare for next phase`],
  };
}
