import { OutcomeCapturer } from "../packages/outcomes/src/index.js";

async function main() {
  console.log("--- Phase 10 Wave 3 Smoke Test (Reliability Scoring) ---");

  const adapterId = "premium-llm-v1";

  try {
    console.log(`[Test] Recording 3 outcomes for ${adapterId}...`);
    
    // 1. Success
    await OutcomeCapturer.record(OutcomeCapturer.normalize({
      runId: `run-3-1-${Date.now()}`,
      success: true,
      retryCount: 0,
      timeTakenMs: 1200,
      qualityScore: 0.9,
      adaptersUsed: [adapterId],
    }));

    // 2. Success with retries
    await OutcomeCapturer.record(OutcomeCapturer.normalize({
      runId: `run-3-2-${Date.now()}`,
      success: true,
      retryCount: 2,
      timeTakenMs: 4500,
      qualityScore: 0.85,
      adaptersUsed: [adapterId],
    }));

    // 3. Failure
    await OutcomeCapturer.record(OutcomeCapturer.normalize({
      runId: `run-3-3-${Date.now()}`,
      success: false,
      retryCount: 3,
      timeTakenMs: 8000,
      qualityScore: 0,
      adaptersUsed: [adapterId],
      failureType: "TIMEOUT_ERROR",
    }));

    console.log("Success! Reliability scoring triggered for 3 outcomes.");
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
}

main();
