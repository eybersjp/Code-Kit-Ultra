import type { Assumption, ClarifyingQuestion, UserInput } from "../../shared/src/types";
export function deriveAssumptions(input: UserInput): Assumption[] {
  const assumptions: Assumption[] = [];
  if (!input.deliverable) assumptions.push({ id: "a1", text: "Defaulting deliverable to app/web system unless specified otherwise.", confidence: "medium" });
  if (!input.priority) assumptions.push({ id: "a2", text: "Defaulting priority to quality-balanced execution.", confidence: "medium" });
  return assumptions;
}
export function generateClarifyingQuestions(input: UserInput): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];
  if (!/internal|saas|commercial|client/i.test(input.idea)) questions.push({ id: "q1", text: "Is this an internal tool, commercial SaaS, or client-specific solution?", blocking: true });
  if (!/firebase|supabase|postgres|mysql|node|python|react|next/i.test(input.idea)) questions.push({ id: "q2", text: "Do you want me to choose the stack, or do you have a preferred stack?", blocking: false });
  return questions;
}