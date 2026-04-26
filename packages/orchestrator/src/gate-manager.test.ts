import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateGates, getOverallGateStatus } from "./gate-manager";
import type { GateEvaluationInput } from "./gate-manager";

vi.mock("./mode-controller", () => ({
  getModePolicy: vi.fn((mode = "builder") => {
    const policies: Record<string, any> = {
      builder: {
        mode: "builder",
        gateThresholds: {
          maxQuestionsBeforeBlock: 10,
          maxQuestionsBeforeReview: 5,
          minimumPlanTasks: 5,
          minimumSelectedSkills: 2,
          ambiguityBlockThreshold: 8,
          ambiguityReviewThreshold: 4,
        },
      },
      turbo: {
        mode: "turbo",
        gateThresholds: {
          maxQuestionsBeforeBlock: 15,
          maxQuestionsBeforeReview: 99,
          minimumPlanTasks: 3,
          minimumSelectedSkills: 1,
          ambiguityBlockThreshold: 15,
          ambiguityReviewThreshold: 10,
        },
      },
      safe: {
        mode: "safe",
        gateThresholds: {
          maxQuestionsBeforeBlock: 3,
          maxQuestionsBeforeReview: 1,
          minimumPlanTasks: 10,
          minimumSelectedSkills: 3,
          ambiguityBlockThreshold: 2,
          ambiguityReviewThreshold: 1,
        },
      },
      god: {
        mode: "god",
        gateThresholds: {
          maxQuestionsBeforeBlock: 100,
          maxQuestionsBeforeReview: 100,
          minimumPlanTasks: 1,
          minimumSelectedSkills: 0,
          ambiguityBlockThreshold: 100,
          ambiguityReviewThreshold: 100,
        },
      },
    };
    return policies[mode] || policies.builder;
  }),
}));

const baseInput: GateEvaluationInput = {
  clarificationResult: {
    normalizedIdea: "Build a task manager app",
    inferredProjectType: "web-app",
    assumptions: [],
    clarifyingQuestions: [],
    completeness: "sufficient-for-initial-planning",
  },
  plan: [
    {
      id: "t1",
      title: "Setup",
      description: "",
      status: "pending",
      type: "planning",
      dependencies: ["t0"],
      metadata: {},
    },
    {
      id: "t2",
      title: "Build",
      description: "",
      status: "pending",
      type: "implementation",
      dependencies: ["t1"],
      metadata: {},
    },
    {
      id: "t3",
      title: "Test",
      description: "",
      status: "pending",
      type: "skills",
      dependencies: ["t2"],
      metadata: {},
    },
    {
      id: "t4",
      title: "Deploy",
      description: "",
      status: "pending",
      type: "deployment",
      dependencies: ["t3"],
      metadata: {},
    },
    {
      id: "t5",
      title: "Monitor",
      description: "",
      status: "pending",
      type: "automation",
      dependencies: ["t4"],
      metadata: {},
    },
  ],
  selectedSkills: [
    {
      skillId: "s1",
      name: "React Expert",
      category: "frontend",
      reason: "UI needed",
      source: "registry",
    },
    {
      skillId: "s2",
      name: "Node Backend",
      category: "backend",
      reason: "API needed",
      source: "registry",
    },
  ],
  mode: "builder",
};

describe("evaluateGates", () => {
  // TC-GATE-OBJ-001: No normalised objective → blocked
  it("should block when no normalized objective is provided", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: { ...baseInput.clarificationResult, normalizedIdea: "" },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("blocked");
    expect(result.overallStatus).toBe("blocked");
    expect(gate?.shouldPause).toBe(true);
  });

  // TC-GATE-OBJ-002: Objective present but category unknown → needs-review
  it("should need review when objective exists but category is unknown", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        normalizedIdea: "Build a CRM",
        inferredProjectType: "unclear",
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("needs-review");
    expect(result.overallStatus).toBe("needs-review");
  });

  // TC-GATE-OBJ-003: Clear objective and known category → pass
  it("should pass when objective is clear and category is known", () => {
    const result = evaluateGates(baseInput);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("pass");
  });

  // TC-GATE-REQ-001: Exceeds maxQuestionsBeforeBlock → blocked
  it("should block when questions exceed max before block threshold", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        clarifyingQuestions: Array(11)
          .fill(null)
          .map((_, i) => ({
            id: `q${i}`,
            text: `Question ${i}`,
            blocking: false,
          })),
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "requirements-completeness");
    expect(gate?.status).toBe("blocked");
  });

  // TC-GATE-REQ-002: Within review threshold → needs-review
  it("should need review when questions are within review threshold", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        clarifyingQuestions: Array(6)
          .fill(null)
          .map((_, i) => ({
            id: `q${i}`,
            text: `Question ${i}`,
            blocking: false,
          })),
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "requirements-completeness");
    expect(gate?.status).toBe("needs-review");
  });

  // TC-GATE-REQ-003: Below review threshold → pass
  it("should pass when questions are below review threshold", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        clarifyingQuestions: Array(2)
          .fill(null)
          .map((_, i) => ({
            id: `q${i}`,
            text: `Question ${i}`,
            blocking: false,
          })),
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "requirements-completeness");
    expect(gate?.status).toBe("pass");
  });

  // TC-GATE-PLAN-001: Empty task list → blocked
  it("should block when plan is empty", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      plan: [],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "plan-readiness");
    expect(gate?.status).toBe("blocked");
  });

  // TC-GATE-PLAN-002: Tasks present but no dependencies → needs-review
  it("should need review when plan has tasks but no dependencies", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      plan: [{ id: "t1", title: "Task 1", description: "", status: "pending", type: "planning", dependencies: [], metadata: {} }],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "plan-readiness");
    expect(gate?.status).toBe("needs-review");
  });

  // TC-GATE-PLAN-003: Sufficient tasks with dependencies → pass
  it("should pass when plan has sufficient tasks with dependencies", () => {
    const result = evaluateGates(baseInput);
    const gate = result.decisions.find((d) => d.gate === "plan-readiness");
    expect(gate?.status).toBe("pass");
  });

  // TC-GATE-SKILL-001: No skills selected → blocked
  it("should block when no skills are selected", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      selectedSkills: [],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "skill-coverage");
    expect(gate?.status).toBe("blocked");
  });

  // TC-GATE-SKILL-002: Only fallback skills → needs-review
  it("should need review when only fallback skills are selected", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      selectedSkills: [
        {
          skillId: "s1",
          name: "Generic Helper",
          category: "fallback",
          reason: "Default",
          source: "registry",
        },
      ],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "skill-coverage");
    expect(gate?.status).toBe("needs-review");
  });

  // TC-GATE-SKILL-003: Has specialist skills → pass
  it("should pass when specialist skills are selected", () => {
    const result = evaluateGates(baseInput);
    const gate = result.decisions.find((d) => d.gate === "skill-coverage");
    expect(gate?.status).toBe("pass");
  });

  // TC-GATE-AMB-001: Ambiguity signal above block threshold → blocked
  it("should block when ambiguity is above block threshold", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        clarifyingQuestions: Array(9)
          .fill(null)
          .map((_, i) => ({
            id: `q${i}`,
            text: `Question ${i}`,
            blocking: false,
          })),
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "ambiguity-risk");
    expect(gate?.status).toBe("blocked");
  });

  // TC-GATE-AMB-002: High assumptions with some questions → needs-review
  it("should need review when assumptions are high", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        assumptions: Array(7)
          .fill(null)
          .map((_, i) => ({
            id: `a${i}`,
            text: `Assumption ${i}`,
            confidence: "medium" as const,
          })),
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "ambiguity-risk");
    expect(gate?.status).toBe("needs-review");
  });

  // TC-GATE-AMB-003: Low ambiguity → pass
  it("should pass when ambiguity is low", () => {
    const result = evaluateGates(baseInput);
    const gate = result.decisions.find((d) => d.gate === "ambiguity-risk");
    expect(gate?.status).toBe("pass");
  });

  // TC-SEQ-004: Manual approval overrides a needs-review gate
  it("should override a needs-review gate when manually approved", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      clarificationResult: {
        ...baseInput.clarificationResult,
        inferredProjectType: "unclear",
      },
      approvedGates: ["objective-clarity"],
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("pass");
    expect(gate?.reason).toContain("MANUALLY APPROVED");
  });

  // TC-MODE-001: turbo mode auto-passes needs-review gates
  it("should auto-pass needs-review gates in turbo mode", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      mode: "turbo",
      clarificationResult: {
        ...baseInput.clarificationResult,
        inferredProjectType: "unclear", // would produce needs-review in builder
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("pass");
    expect(gate?.reason).toContain("AUTO-PASSED VIA TURBO");
  });

  // TC-MODE-002: turbo mode does NOT override blocked gates
  it("should NOT auto-pass blocked gates in turbo mode", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      mode: "turbo",
      clarificationResult: {
        ...baseInput.clarificationResult,
        normalizedIdea: "", // This will produce blocked status
      },
    };
    const result = evaluateGates(input);
    const gate = result.decisions.find((d) => d.gate === "objective-clarity");
    expect(gate?.status).toBe("blocked");
  });

  // TC-MODE-005: builder mode (default) uses standard thresholds
  it("should default to builder mode when mode is not specified", () => {
    const input: GateEvaluationInput = {
      ...baseInput,
      mode: undefined,
    };
    const result = evaluateGates(input);
    expect(result.overallStatus).toBe("pass");
  });

  // Overall integration test
  it("should return overallStatus pass when all inputs are valid", () => {
    const result = evaluateGates(baseInput);
    expect(result.overallStatus).toBe("pass");
    expect(result.decisions.every((d) => d.status === "pass")).toBe(true);
    expect(result.summary).toContain("Pass=5");
  });
});

describe("getOverallGateStatus", () => {
  // TC-SEQ-001: First blocked gate short-circuits overall status
  it("should return blocked when any decision is blocked", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "blocked" as const, reason: "", shouldPause: true },
      { gate: "g3", status: "needs-review" as const, reason: "", shouldPause: true },
    ];
    expect(getOverallGateStatus(decisions)).toBe("blocked");
  });

  // TC-SEQ-002: needs-review gates accumulate
  it("should return needs-review when no blocked but some needs-review", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "needs-review" as const, reason: "", shouldPause: true },
    ];
    expect(getOverallGateStatus(decisions)).toBe("needs-review");
  });

  // TC-SEQ-003: All gates pass → overallStatus is "pass"
  it("should return pass when all decisions pass", () => {
    const decisions = [
      { gate: "g1", status: "pass" as const, reason: "", shouldPause: false },
      { gate: "g2", status: "pass" as const, reason: "", shouldPause: false },
    ];
    expect(getOverallGateStatus(decisions)).toBe("pass");
  });
});
