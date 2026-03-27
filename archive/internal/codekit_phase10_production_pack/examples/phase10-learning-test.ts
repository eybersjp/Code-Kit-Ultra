import { resetLearningStore, loadLearningStore } from "../packages/learning/src/store";
import { recordRunOutcome } from "../packages/orchestrator/src/outcome-engine";
import { buildLearningReport } from "../packages/learning/src/learning-engine";
import { optimizeTasks } from "../packages/learning/src/execution-optimizer";

resetLearningStore();

recordRunOutcome({
  runId: "run-1",
  success: false,
  retryCount: 2,
  timeTakenMs: 1200,
  qualityScore: 0.4,
  adaptersUsed: ["terminal"],
  dominantFailureType: "permission-denied",
});

recordRunOutcome({
  runId: "run-2",
  success: false,
  retryCount: 1,
  timeTakenMs: 800,
  qualityScore: 0.45,
  adaptersUsed: ["terminal"],
  dominantFailureType: "permission-denied",
});

recordRunOutcome({
  runId: "run-3",
  success: true,
  retryCount: 0,
  timeTakenMs: 300,
  qualityScore: 0.95,
  adaptersUsed: ["file-system"],
});

const store = loadLearningStore();

if (store.patterns.length === 0) {
  throw new Error("Expected learned patterns.");
}

if (store.reliability.length === 0) {
  throw new Error("Expected reliability scores.");
}

const report = buildLearningReport();

if (report.totalOutcomes !== 3) {
  throw new Error("Unexpected total outcome count.");
}

const result = optimizeTasks(
  [
    { id: "t1", title: "Run shell command", adapterId: "terminal" },
    { id: "t2", title: "Write file", adapterId: "file-system" },
  ],
  store,
);

if (result.suggestions.length === 0) {
  throw new Error("Expected optimization suggestions.");
}

console.log("Phase 10 learning test passed");
