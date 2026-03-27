import type { LearningReport, RunOutcome } from "../../shared/src/phase10-types";
import { loadLearningStore, saveLearningStore } from "./store";
import { updatePatterns } from "./pattern-engine";
import { rebuildReliability } from "./reliability-engine";
import { buildAdaptivePolicyOverlays } from "./adaptive-policy";

export function learnFromOutcome(outcome: RunOutcome): void {
  const store = loadLearningStore();
  store.outcomes.push(outcome);
  store.patterns = updatePatterns(store.patterns, outcome);
  store.reliability = rebuildReliability(store.outcomes);
  store.policyOverlays = buildAdaptivePolicyOverlays(store.reliability, store.patterns);
  saveLearningStore(store);
}

export function buildLearningReport(): LearningReport {
  const store = loadLearningStore();
  const strongest = [...store.reliability]
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
    .slice(0, 3);
  const weakest = [...store.reliability]
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore)
    .slice(0, 3);
  const topPatterns = [...store.patterns]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    totalOutcomes: store.outcomes.length,
    topPatterns,
    weakestAdapters: weakest,
    strongestAdapters: strongest,
    overlays: store.policyOverlays,
  };
}
