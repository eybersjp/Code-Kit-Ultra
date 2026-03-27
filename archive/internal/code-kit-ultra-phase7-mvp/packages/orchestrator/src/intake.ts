import type { Assumption, ClarifyingQuestion, UserInput } from "../../shared/src/types";

export function deriveAssumptions(input: UserInput): Assumption[] {
  const assumptions: Assumption[] = [];

  if (!input.deliverable) {
    assumptions.push({
      id: "a1",
      text: "Defaulting deliverable to app/web system unless specified otherwise.",
      confidence: "medium",
    });
  }

  if (!input.priority) {
    assumptions.push({
      id: "a2",
      text: "Defaulting priority to quality-balanced execution.",
      confidence: "medium",
    });
  }

  if (!/mobile|ios|android/i.test(input.idea)) {
    assumptions.push({
      id: "a3",
      text: "Assuming web-first responsive experience unless native mobile is explicitly required.",
      confidence: "medium",
    });
  }

  if (!/single-tenant|multi-tenant/i.test(input.idea)) {
    assumptions.push({
      id: "a4",
      text: "Assuming single-tenant MVP unless tenancy requirements are stated.",
      confidence: "low",
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
      text: "Do you want the system to choose the stack, or do you already have a preferred stack?",
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

  if (!/deploy|production|host/i.test(input.idea)) {
    questions.push({
      id: "q4",
      text: "Should this MVP stop at planning and mock execution, or should it prepare for deployment too?",
      blocking: false,
    });
  }

  if (!/integrat|api|webhook/i.test(input.idea)) {
    questions.push({
      id: "q5",
      text: "Will the first version need external API integrations?",
      blocking: false,
    });
  }

  return questions;
}
