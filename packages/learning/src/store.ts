import fs from "node:fs";
import path from "node:path";
import type { LearningStore } from "../../shared/src/phase10-types";

const STORE_PATH = path.resolve(".codekit/learning/learning-store.json");

function createDefaultStore(): LearningStore {
  return {
    version: 1,
    outcomes: [],
    patterns: [],
    reliability: [],
    policyOverlays: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadLearningStore(): LearningStore {
  if (!fs.existsSync(STORE_PATH)) {
    return createDefaultStore();
  }
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as LearningStore;
}

export function saveLearningStore(store: LearningStore): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export function resetLearningStore(): void {
  saveLearningStore(createDefaultStore());
}
