import path from "node:path";
import type { PlanTask, UserInput } from "../../shared/src/types";

export function buildInitialPlan(input: UserInput): PlanTask[] {
  const slug = input.idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";

  const generatedRoot = path.resolve(".codekit/generated", slug);

  return [
    {
      id: "p1",
      phase: "intake",
      title: "Capture normalized intake",
      description: "Persist intake details for the control plane and future resume flows.",
      doneDefinition: "Intake artifact is generated and readable.",
      taskType: "file-write",
      adapterId: "fs",
      payload: {
        path: path.join(generatedRoot, "00-intake-note.md"),
        content: `# Intake\n\nIdea: ${input.idea}\nMode: ${input.mode}\nDeliverable: ${input.deliverable ?? "app"}\n`,
      },
      retryPolicy: { maxAttempts: 1 },
      rollbackPayload: { path: path.join(generatedRoot, "00-intake-note.md") },
    },
    {
      id: "p2",
      phase: "planning",
      title: "Generate MVP scaffold plan",
      description: "Create a local implementation outline artifact.",
      doneDefinition: "Plan scaffold markdown exists.",
      taskType: "file-write",
      adapterId: "fs",
      payload: {
        path: path.join(generatedRoot, "01-plan.md"),
        content: `# MVP Plan\n\n- Define user journeys\n- Implement core entities\n- Build UI and APIs\n- Add QA and deployment checks\n`,
      },
      retryPolicy: { maxAttempts: 2 },
      rollbackPayload: { path: path.join(generatedRoot, "01-plan.md") },
    },
    {
      id: "p3",
      phase: "execution",
      title: "Prepare workspace command",
      description: "Record or run a safe command for local setup.",
      doneDefinition: "A terminal execution log exists.",
      taskType: "terminal",
      adapterId: "terminal",
      payload: {
        command: "echo",
        args: ["Phase 8 workspace prepared"],
        allowExecution: input.allowCommandExecution ?? false,
      },
      retryPolicy: { maxAttempts: 1 },
    },
    {
      id: "p4",
      phase: "governance",
      title: "Approval checkpoint before provider expansion",
      description: "Pause before external-provider-style operations.",
      doneDefinition: "Run pauses for approval when policy requires it.",
      taskType: "approval",
      adapterId: "ai",
      payload: { intent: "provider-expansion-checkpoint" },
      requiresApproval: true,
      retryPolicy: { maxAttempts: 1 },
    },
    {
      id: "p5",
      phase: "delivery",
      title: "Draft provider expansion backlog",
      description: "Persist the next implementation wave for GitHub/API/AI adapters.",
      doneDefinition: "Backlog artifact exists.",
      taskType: "file-write",
      adapterId: "fs",
      payload: {
        path: path.join(generatedRoot, "02-provider-expansion-backlog.md"),
        content: [
          "# Provider Expansion Backlog",
          "",
          "- Wire GitHub adapter to live repositories and tokens",
          "- Wire API adapter to service-specific schemas",
          "- Wire AI adapter to governed provider prompts",
          "- Add rollback and retry observability",
        ].join("\n"),
      },
      retryPolicy: { maxAttempts: 2 },
      rollbackPayload: { path: path.join(generatedRoot, "02-provider-expansion-backlog.md") },
    },
  ];
}
