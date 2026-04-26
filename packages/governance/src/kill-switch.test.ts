import { describe, it, expect } from "vitest";
import { evaluateKillSwitch } from "./kill-switch";

const validParams = {
  confidence: {
    overall: 0.95,
    alignmentScore: 1.0,
    validationScore: 1.0,
    policyScore: 1.0,
    consensusScore: 0.9,
    summary: "High confidence",
  },
  constraints: { valid: true, violations: [], summary: "All constraints passed" },
  consensus: { finalDecision: "approve" as const, agreementScore: 1.0, votes: [], summary: "Strong consensus" },
};

describe("evaluateKillSwitch", () => {
  // TC-KS-001: Kill switch active → gate blocked immediately
  it("should block when constraint violations exist", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      constraints: {
        valid: false,
        violations: [{ code: "BLOCKED_ACTION_TYPE", message: "Test violation" }],
        summary: "Constraint violation detected",
      },
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("CONSTRAINT_VIOLATION");
    expect(result.reason).toContain("constraint violations");
  });

  it("should block when consensus is rejected", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      consensus: { finalDecision: "reject", agreementScore: 0.1, votes: [], summary: "Consensus rejected" },
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("CONSENSUS_REJECTED");
    expect(result.reason).toContain("consensus rejected");
  });

  it("should block when confidence is below default threshold (0.7)", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.6,
      },
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("LOW_CONFIDENCE");
    expect(result.reason).toContain("confidence 0.6");
    expect(result.reason).toContain("0.7");
  });

  // TC-KS-002: Kill switch inactive → gate passes
  it("should allow execution when all conditions are met", () => {
    const result = evaluateKillSwitch(validParams);
    expect(result.blocked).toBe(false);
    expect(result.code).toBe("CLEAR");
    expect(result.reason).toContain("cleared");
  });

  it("should allow execution with confidence exactly at threshold", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.7,
      },
    });
    expect(result.blocked).toBe(false);
    expect(result.code).toBe("CLEAR");
  });

  it("should use custom threshold when provided", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.8,
      },
      threshold: 0.9,
    });
    // threshold is 0.9, confidence is 0.8, so it should block
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("LOW_CONFIDENCE");
    expect(result.reason).toContain("0.8");
    expect(result.reason).toContain("0.9");
  });

  it("should allow high confidence with custom threshold", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.95,
      },
      threshold: 0.8,
    });
    expect(result.blocked).toBe(false);
    expect(result.code).toBe("CLEAR");
  });

  // Priority of blocking conditions
  it("should block on constraint violations before checking confidence", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.5, // Below threshold
      },
      constraints: {
        valid: false,
        violations: [{ code: "BLOCKED_ACTION_TYPE", message: "Test" }],
        summary: "Constraint violation detected",
      },
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("CONSTRAINT_VIOLATION");
  });

  it("should block on consensus rejection before checking confidence", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.5, // Below threshold
      },
      consensus: { finalDecision: "reject", agreementScore: 0.0, votes: [], summary: "Consensus rejected" },
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("CONSENSUS_REJECTED");
  });

  it("should provide clear message on low confidence", () => {
    const result = evaluateKillSwitch({
      ...validParams,
      confidence: {
        ...validParams.confidence,
        overall: 0.25,
      },
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("confidence 0.25 is below threshold 0.7");
  });
});
