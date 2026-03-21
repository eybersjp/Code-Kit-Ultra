import type { PlanTask, UserInput } from "../../shared/src/types";
export function buildInitialPlan(input: UserInput): PlanTask[] {
  return [
    { id: "p1", phase: "intake", taskType: "planning", title: "Interpret project idea", description: `Parse and frame the project: ${input.idea}`, doneDefinition: "Project goal, users, and outcome are understandable." },
    { id: "p2", phase: "planning", taskType: "planning", title: "Generate execution plan", description: "Break work into milestones and task flows.", doneDefinition: "Hierarchical plan exists." },
    { id: "p3", phase: "skills", taskType: "skills", title: "Select or generate required skills", description: "Map skills to major tasks.", doneDefinition: "Skill coverage exists." },
    { id: "p4", phase: "implementation", taskType: "implementation", title: "Analyze implementation path", description: "Prepare implementation-ready structured response.", doneDefinition: "Implementation path is defined." }
  ];
}