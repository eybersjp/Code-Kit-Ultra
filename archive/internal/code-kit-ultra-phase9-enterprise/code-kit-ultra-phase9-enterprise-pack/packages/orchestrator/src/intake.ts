import type { Assumption, ClarifyingQuestion, UserInput } from "../../shared/src/types";

export function deriveAssumptions(input: UserInput): Assumption[] {
  const assumptions: Assumption[] = [];

  if (!/mobile|ios|android/i.test(input.idea)) {
    assumptions.push({
      id: "a1",
      text: "Assuming web-first responsive experience unless native mobile is explicitly required.",
      confidence: "medium",
    });
  }

  if (!/single-tenant|multi-tenant/i.test(input.idea)) {
    assumptions.push({
      id: "a2",
      text: "Assuming single-tenant MVP unless tenancy requirements are stated.",
      confidence: "low",
    });
  }

  if (!/deploy|hosting|infrastructure/i.test(input.idea)) {
    assumptions.push({
      id: "a3",
      text: "Assuming delivery should prioritize executable scaffold outputs before deployment wiring.",
      confidence: "medium",
    });
  }

  return assumptions;
}

export function generateClarifyingQuestions(input: UserInput): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  if (!/internal|saas|commercial|client/i.test(input.idea)) {
    questions.push({
      id: "q1",
      text: "Is this an internal tool, commercial SaaS, or client-specific solution?",
      blocking: true,
    });
  }

  if (!/firebase|supabase|postgres|mysql|node|python|react|next/i.test(input.idea)) {
    questions.push({
      id: "q2",
      text: "Should the system choose the stack automatically, or do you already have a preferred stack?",
      blocking: false,
    });
  }

  if (!/auth|login|users|roles/i.test(input.idea)) {
    questions.push({
      id: "q3",
      text: "Will the system need authentication and multiple user roles?",
      blocking: false,
    });
  }

  return questions;
}
