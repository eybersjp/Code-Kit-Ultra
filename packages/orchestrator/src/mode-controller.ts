import type { ClarifyingQuestion, GateType, Mode } from "../../shared/src/types";
export interface ModePolicy { mode: Mode; maxQuestions: number; pauseGates: GateType[]; autoProceedNonCritical: boolean; }
export function getModePolicy(mode: Mode): ModePolicy {
  switch (mode) {
    case "safe": return { mode, maxQuestions: 10, pauseGates: ["clarity","scope","architecture","qa","security","cost","deployment"], autoProceedNonCritical: false };
    case "god": return { mode, maxQuestions: 2, pauseGates: ["deployment"], autoProceedNonCritical: true };
    default: return { mode, maxQuestions: 4, pauseGates: ["architecture","deployment"], autoProceedNonCritical: true };
  }
}
export function trimQuestionsByMode(questions: ClarifyingQuestion[], mode: Mode): ClarifyingQuestion[] {
  const policy = getModePolicy(mode);
  const blocking = questions.filter((q) => q.blocking);
  const nonBlocking = questions.filter((q) => !q.blocking);
  return [...blocking, ...nonBlocking].slice(0, policy.maxQuestions);
}