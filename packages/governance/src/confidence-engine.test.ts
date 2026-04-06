import { describe, it, expect } from "vitest";
import { scoreExecution } from "./confidence-engine";

const maxInputs = {
  intent: { confidence: 1.0, aligned: true, summary: "" },
  validation: { valid: true, errors: [] },
  constraints: { valid: true, violations: [] },
  consensus: { finalDecision: "approve" as const, agreementScore: 1.0, votes: [] },
};

describe("scoreExecution", () => {
  // TC-CONF-001: All sub-scores at maximum → overall score near 1.0
  it("should return overall score of 1.0 when all sub-scores are at maximum", () => {
    const result = scoreExecution(maxInputs);
    expect(result.overall).toBe(1.0);
    expect(result.alignmentScore).toBe(1.0);
    expect(result.validationScore).toBe(1.0);
    expect(result.policyScore).toBe(1.0);
    expect(result.consensusScore).toBe(1.0);
  });

  // TC-CONF-002: Failed validation reduces score proportionally
  it("should reduce the score when validation fails", () => {
    const result = scoreExecution({
      ...maxInputs,
      validation: { valid: false, errors: ["missing field"] },
    });
    expect(result.validationScore).toBe(0.4);
    expect(result.overall).toBeLessThan(1.0);
    // overall = (1.0 * 0.35) + (0.4 * 0.2) + (1.0 * 0.25) + (1.0 * 0.2) = 0.35 + 0.08 + 0.25 + 0.2 = 0.88
    expect(result.overall).toBeCloseTo(0.88, 2);
  });

  // TC-CONF-003: Consensus "revise" reduces consensus score by 40%
  it("should reduce consensus score by 40% when decision is revise", () => {
    const result = scoreExecution({
      ...maxInputs,
      consensus: { finalDecision: "revise", agreementScore: 1.0, votes: [] },
    });
    expect(result.consensusScore).toBeCloseTo(0.6, 2);
    // overall = (1.0 * 0.35) + (1.0 * 0.2) + (1.0 * 0.25) + (0.6 * 0.2) = 0.35 + 0.2 + 0.25 + 0.12 = 0.92
    expect(result.overall).toBeCloseTo(0.92, 2);
  });

  // TC-CONF-004: Consensus "reject" produces near-zero consensus score
  it("should produce near-zero consensus score when decision is reject", () => {
    const result = scoreExecution({
      ...maxInputs,
      consensus: { finalDecision: "reject", agreementScore: 0.0, votes: [] },
    });
    expect(result.consensusScore).toBeCloseTo(0.1, 2);
    // overall = (1.0 * 0.35) + (1.0 * 0.2) + (1.0 * 0.25) + (0.1 * 0.2) = 0.35 + 0.2 + 0.25 + 0.02 = 0.82
    expect(result.overall).toBeCloseTo(0.82, 2);
  });

  // TC-CONF-005: Weights sum to 1.0 (regression guard)
  it("should use weights that sum to 1.0", () => {
    const result = scoreExecution(maxInputs);
    // Verify the formula: 0.35 + 0.2 + 0.25 + 0.2 = 1.0
    expect(result.overall).toBe(1.0);
  });

  // Additional tests for partial failures
  it("should handle constraint violations reducing policy score", () => {
    const result = scoreExecution({
      ...maxInputs,
      constraints: { valid: false, violations: [{ code: "TEST", message: "test" }] },
    });
    expect(result.policyScore).toBe(0.2);
    // overall = (1.0 * 0.35) + (1.0 * 0.2) + (0.2 * 0.25) + (1.0 * 0.2) = 0.35 + 0.2 + 0.05 + 0.2 = 0.8
    expect(result.overall).toBeCloseTo(0.8, 2);
  });

  // Partial alignment confidence
  it("should scale alignment score with partial confidence", () => {
    const result = scoreExecution({
      ...maxInputs,
      intent: { confidence: 0.5, aligned: true, summary: "" },
    });
    expect(result.alignmentScore).toBe(0.5);
    // overall = (0.5 * 0.35) + (1.0 * 0.2) + (1.0 * 0.25) + (1.0 * 0.2) = 0.175 + 0.2 + 0.25 + 0.2 = 0.825
    expect(result.overall).toBeCloseTo(0.82, 1);
  });

  // Multiple failures combined
  it("should handle multiple failures reducing overall score significantly", () => {
    const result = scoreExecution({
      intent: { confidence: 0.5, aligned: false, summary: "" },
      validation: { valid: false, errors: ["error1", "error2"] },
      constraints: { valid: false, violations: [{ code: "TEST", message: "test" }] },
      consensus: { finalDecision: "reject", agreementScore: 0.0, votes: [] },
    });
    // overall = (0.5 * 0.35) + (0.4 * 0.2) + (0.2 * 0.25) + (0.1 * 0.2)
    // = 0.175 + 0.08 + 0.05 + 0.02 = 0.325, rounded to 2 decimals = 0.33
    expect(result.overall).toBeCloseTo(0.33, 2);
  });

  it("should include a summary message", () => {
    const result = scoreExecution(maxInputs);
    expect(result.summary).toContain("Overall governed execution confidence");
    expect(result.summary).toContain("1");
  });
});
