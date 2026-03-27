import { buildLearningReport } from "../../learning/src/learning-engine";
import { loadLearningStore } from "../../learning/src/store";

export function getLearningReport() {
  return buildLearningReport();
}

export function getReliability() {
  return loadLearningStore().reliability;
}

export function getAdaptivePolicies() {
  return loadLearningStore().policyOverlays;
}
