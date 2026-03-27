import type { PlanTask, UserInput } from "../../shared/src/types";

export function buildInitialPlan(input: UserInput): PlanTask[] {
  return [
    { id: "p1", phase: "intake", taskType: "planning", title: "Interpret project idea", description: `Parse and frame the project: ${input.idea}`, doneDefinition: "Project goal, users, and outcome are understandable." },
    { id: "p2", phase: "clarity", taskType: "planning", title: "Resolve critical ambiguities", description: "Identify missing information and convert assumptions into questions where needed.", doneDefinition: "Blocking ambiguities are identified." },
    { id: "p3", phase: "planning", taskType: "planning", title: "Generate execution plan", description: "Break work into milestones, tasks, and definitions of done.", doneDefinition: "Hierarchical plan exists." },
    { id: "p4", phase: "skills", taskType: "skills", title: "Select or generate required skills", description: "Map skills to major tasks in the plan.", doneDefinition: "Each major task has at least one skill path." },
    { id: "p5", phase: "automation", taskType: "automation", title: "Prepare workflow and routing", description: "Resolve adapter routes and platform execution strategy.", doneDefinition: "Routes are selected for task types." },
    { id: "p6", phase: "delivery", taskType: "general", title: "Generate execution report", description: "Create summary artifact for the run.", doneDefinition: "Report file is written." }
  ];
}