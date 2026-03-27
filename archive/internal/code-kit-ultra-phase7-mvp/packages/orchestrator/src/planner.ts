import type { PlanTask, UserInput } from "../../shared/src/types";

export function buildInitialPlan(input: UserInput): PlanTask[] {
  const titleBase = input.idea.trim();

  return [
    {
      id: "p1",
      phase: "intake",
      title: "Interpret project idea",
      description: `Parse and frame the project: ${titleBase}`,
      doneDefinition: "Project goal, users, and target outcome are understandable.",
      taskType: "analysis",
    },
    {
      id: "p2",
      phase: "clarity",
      title: "Resolve critical ambiguities",
      description: "Identify missing information and convert assumptions into explicit questions where needed.",
      doneDefinition: "Blocking ambiguities are identified and surfaced.",
      taskType: "clarification",
    },
    {
      id: "p3",
      phase: "planning",
      title: "Generate MVP execution plan",
      description: "Break the work into milestones, tasks, and done definitions.",
      doneDefinition: "A phase-aligned implementation plan exists.",
      taskType: "planning",
    },
    {
      id: "p4",
      phase: "skills",
      title: "Select or generate required skills",
      description: "Match installed skills to the idea and create fallback scaffold skills when needed.",
      doneDefinition: "Every major workstream has a skill path.",
      taskType: "skill-selection",
    },
    {
      id: "p5",
      phase: "gates",
      title: "Prepare gates and decision points",
      description: "Evaluate clarity, architecture, QA, and deployment decisions.",
      doneDefinition: "Gate outcomes are computed and pause behavior is known.",
      taskType: "governance",
    },
    {
      id: "p6",
      phase: "execution",
      title: "Route tasks to mock adapters",
      description: "Simulate execution using deterministic platform adapters.",
      doneDefinition: "Each task is routed to a compatible mock adapter.",
      taskType: "mock-execution",
    },
    {
      id: "p7",
      phase: "delivery",
      title: "Generate execution report",
      description: "Produce JSON and markdown artifacts for the run.",
      doneDefinition: "Reports are written to disk and summarized in the CLI.",
      taskType: "reporting",
    },
  ];
}
