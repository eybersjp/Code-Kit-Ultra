import type { PlanTask, UserInput } from "../../shared/src/types";

export function buildInitialPlan(input: UserInput): PlanTask[] {
  const titleBase = input.idea.trim();

  return [
    {
      id: "p1",
      phase: "intake",
      title: "Interpret project idea",
      description: `Parse and frame the project: ${titleBase}`,
      doneDefinition: "Project goal, users, and outcome are understandable.",
      taskType: "planning"
    },
    {
      id: "p2",
      phase: "clarity",
      title: "Resolve critical ambiguities",
      description: "Identify missing information and convert assumptions into questions where needed.",
      doneDefinition: "Blocking ambiguities are identified.",
      taskType: "planning"
    },
    {
      id: "p3",
      phase: "planning",
      title: "Generate execution plan",
      description: "Break work into milestones, tasks, and definitions of done.",
      doneDefinition: "Hierarchical plan exists.",
      taskType: "planning"
    },
    {
      id: "p4",
      phase: "skills",
      title: "Select or generate required skills",
      description: "Map skills to major tasks in the plan.",
      doneDefinition: "Each major task has at least one skill path.",
      taskType: "skills"
    },
    {
      id: "p5",
      phase: "gates",
      title: "Prepare gates and decision points",
      description: "Create clarity, architecture, QA, and deployment gates.",
      doneDefinition: "Gate strategy is defined.",
      taskType: "reporting"
    },
    {
      id: "p6",
      phase: "delivery",
      title: "Generate execution report",
      description: "Create summary artifact for the run.",
      doneDefinition: "Report file is written.",
      taskType: "reporting"
    }
  ];
}
