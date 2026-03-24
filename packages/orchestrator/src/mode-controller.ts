import type { Mode } from "../../shared/src";

export interface ModePolicy {
  mode: Mode;
  label: string;
  description: string;
  maxClarifyingQuestions: number;
  gateThresholds: {
    maxQuestionsBeforeReview: number;
    maxQuestionsBeforeBlock: number;
    minimumPlanTasks: number;
    minimumSelectedSkills: number;
    ambiguityReviewThreshold: number;
    ambiguityBlockThreshold: number;
  };
  execution: {
    autoExecuteSafeActions: boolean;
    requireApprovalForMediumRisk: boolean;
    requireApprovalForHighRisk: boolean;
    allowCommandExecution: boolean;
    dryRunByDefault: boolean;
  };
}

const MODE_POLICIES: Record<Mode, ModePolicy> = {
  turbo: {
    mode: "turbo",
    label: "Turbo",
    description: "High-speed autonomous build with minimal friction.",
    maxClarifyingQuestions: 2,
    gateThresholds: {
      maxQuestionsBeforeReview: 99, // Essentially no review for questions
      maxQuestionsBeforeBlock: 15,
      minimumPlanTasks: 3,
      minimumSelectedSkills: 1,
      ambiguityReviewThreshold: 10,
      ambiguityBlockThreshold: 15,
    },
    execution: {
      autoExecuteSafeActions: true,
      requireApprovalForMediumRisk: false,
      requireApprovalForHighRisk: true,
      allowCommandExecution: true,
      dryRunByDefault: false,
    },
  },
  builder: {
    mode: "builder",
    label: "Builder",
    description: "Structure-focused with partial automation and minimal approvals.",
    maxClarifyingQuestions: 5,
    gateThresholds: {
      maxQuestionsBeforeReview: 5,
      maxQuestionsBeforeBlock: 10,
      minimumPlanTasks: 5,
      minimumSelectedSkills: 2,
      ambiguityReviewThreshold: 4,
      ambiguityBlockThreshold: 8,
    },
    execution: {
      autoExecuteSafeActions: true,
      requireApprovalForMediumRisk: true,
      requireApprovalForHighRisk: true,
      allowCommandExecution: true,
      dryRunByDefault: false,
    },
  },
  pro: {
    mode: "pro",
    label: "Pro",
    description: "Controlled execution with mandatory approval checkpoints.",
    maxClarifyingQuestions: 8,
    gateThresholds: {
      maxQuestionsBeforeReview: 3,
      maxQuestionsBeforeBlock: 8,
      minimumPlanTasks: 6,
      minimumSelectedSkills: 2,
      ambiguityReviewThreshold: 2,
      ambiguityBlockThreshold: 6,
    },
    execution: {
      autoExecuteSafeActions: false,
      requireApprovalForMediumRisk: true,
      requireApprovalForHighRisk: true,
      allowCommandExecution: true,
      dryRunByDefault: true,
    },
  },
  expert: {
    mode: "expert",
    label: "Expert",
    description: "Manual orchestration with full deterministic control.",
    maxClarifyingQuestions: 15,
    gateThresholds: {
      maxQuestionsBeforeReview: 1,
      maxQuestionsBeforeBlock: 5,
      minimumPlanTasks: 8,
      minimumSelectedSkills: 3,
      ambiguityReviewThreshold: 1,
      ambiguityBlockThreshold: 4,
    },
    execution: {
      autoExecuteSafeActions: false,
      requireApprovalForMediumRisk: true,
      requireApprovalForHighRisk: true,
      allowCommandExecution: true,
      dryRunByDefault: true,
    },
  },
};

export function getModePolicy(mode: Mode = "builder"): ModePolicy {
  return MODE_POLICIES[mode] ?? MODE_POLICIES.builder;
}

type QuestionLike = {
  id?: string;
  text?: string;
  priority?: "critical" | "high" | "medium" | "low";
  required?: boolean;
};

function priorityWeight(question: QuestionLike): number {
  if (question.required) return 100;
  switch (question.priority) {
    case "critical":
      return 90;
    case "high":
      return 70;
    case "medium":
      return 50;
    case "low":
      return 30;
    default:
      return 40;
  }
}

export function trimQuestionsByMode<T extends QuestionLike>(questions: T[], mode: Mode = "builder"): T[] {
  const policy = getModePolicy(mode);
  const sorted = [...questions].sort((a, b) => priorityWeight(b) - priorityWeight(a));
  return sorted.slice(0, policy.maxClarifyingQuestions);
}
