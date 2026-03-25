import { buildLearningReport } from "../../../../packages/learning/src/learning-engine";
import { loadLearningStore } from "../../../../packages/learning/src/store";

export function getLearningReport() {
  return buildLearningReport();
}

export function getReliability() {
  return loadLearningStore().reliability;
}

export function getAdaptivePolicies() {
  return loadLearningStore().policyOverlays;
}
