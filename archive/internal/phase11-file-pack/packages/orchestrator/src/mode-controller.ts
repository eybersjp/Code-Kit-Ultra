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
}

const MODE_POLICIES: Record<Mode, ModePolicy> = {
  safe: {
    mode: "safe",
    label: "Safe",
    description: "Conservative progression with stricter review and more surfaced questions.",
    maxClarifyingQuestions: 8,
    gateThresholds: {
      maxQuestionsBeforeReview: 3,
      maxQuestionsBeforeBlock: 8,
      minimumPlanTasks: 6,
      minimumSelectedSkills: 2,
      ambiguityReviewThreshold: 2,
      ambiguityBlockThreshold: 5,
    },
  },
  balanced: {
    mode: "balanced",
    label: "Balanced",
    description: "Practical default with moderate tolerance for ambiguity.",
    maxClarifyingQuestions: 5,
    gateThresholds: {
      maxQuestionsBeforeReview: 5,
      maxQuestionsBeforeBlock: 9,
      minimumPlanTasks: 5,
      minimumSelectedSkills: 2,
      ambiguityReviewThreshold: 3,
      ambiguityBlockThreshold: 6,
    },
  },
  god: {
    mode: "god",
    label: "God",
    description: "Aggressive forward motion with high ambiguity tolerance.",
    maxClarifyingQuestions: 3,
    gateThresholds: {
      maxQuestionsBeforeReview: 7,
      maxQuestionsBeforeBlock: 12,
      minimumPlanTasks: 4,
      minimumSelectedSkills: 1,
      ambiguityReviewThreshold: 5,
      ambiguityBlockThreshold: 8,
    },
  },
};

export function getModePolicy(mode: Mode = "balanced"): ModePolicy {
  return MODE_POLICIES[mode] ?? MODE_POLICIES.balanced;
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

export function trimQuestionsByMode<T extends QuestionLike>(questions: T[], mode: Mode = "balanced"): T[] {
  const policy = getModePolicy(mode);
  const sorted = [...questions].sort((a, b) => priorityWeight(b) - priorityWeight(a));
  return sorted.slice(0, policy.maxClarifyingQuestions);
}
