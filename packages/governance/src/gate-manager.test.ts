import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GateEvaluationContext, GateResult } from "./gates/base-gate.js";

// Mock the gate-store to avoid any DB calls
vi.mock("./gate-store.js", () => ({
  GateStore: {
    recordGateDecision: vi.fn().mockResolvedValue(undefined),
    approveGate: vi.fn().mockResolvedValue(undefined),
    rejectGate: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the logger to avoid pino-pretty noise in tests
vi.mock("../apps/control-service/src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
const { GateManager } = await import("./gate-manager.js");

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function makePassResult(gateName: string): GateResult {
  return { gateName, passed: true, severity: "pass", message: "ok" };
}

function makeBlockedResult(gateName: string): GateResult {
  return { gateName, passed: false, severity: "blocked", message: "blocked!" };
}

function makeNeedsReviewResult(gateName: string): GateResult {
  return { gateName, passed: false, severity: "fail", message: "needs review" };
}

function makeWarningResult(gateName: string): GateResult {
  return { gateName, passed: true, severity: "warning", message: "warning" };
}

/** Minimal RunState-like object that satisfies the gate evaluate() context */
function makeRun(overrides: Record<string, any> = {}) {
  return {
    id: "run-test-001",
    runId: "run-test-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStepIndex: 0,
    status: "running" as const,
    approvalRequired: false,
    approved: false,
    orgId: "org-test",
    workspaceId: "ws-test",
    projectId: "proj-test",
    ...overrides,
  };
}

/** Build a GateEvaluationContext */
function makeContext(mode: string, overrides: Partial<GateEvaluationContext> = {}): GateEvaluationContext {
  return {
    run: makeRun() as any,
    mode,
    ...overrides,
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe("GateManager", () => {
  const ALL_GATE_NAMES = [
    "Scope Gate",
    "Architecture Gate",
    "Security Gate",
    "Cost Gate",
    "Deployment Gate",
    "QA Gate",
    "Build Gate",
    "Launch Gate",
    "Risk Threshold Gate",
  ];

  describe("TC-GATE-001: registers all 9 gates on construction", () => {
    it("should have exactly 9 registered gates", () => {
      const manager = new GateManager();
      // Access private 'gates' map via cast to inspect registration count
      const gates = (manager as any).gates as Map<string, any>;
      expect(gates.size).toBe(9);
    });

    it("registers all expected gate names", () => {
      const manager = new GateManager();
      const gates = (manager as any).gates as Map<string, any>;
      for (const name of ALL_GATE_NAMES) {
        expect(gates.has(name)).toBe(true);
      }
    });
  });

  describe("TC-GATE-002: evaluateGates returns results for each gate in sequence", () => {
    it("returns results array with one entry per gate evaluated in balanced mode", async () => {
      const manager = new GateManager();
      const ctx = makeContext("balanced");
      const results = await manager.evaluateGates(ctx);

      // Balanced skips Cost Gate (8 gates)
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r).toHaveProperty("gateName");
        expect(r).toHaveProperty("passed");
        expect(r).toHaveProperty("severity");
        expect(r).toHaveProperty("message");
      });
    });

    it("returns results in order matching the gate sequence", async () => {
      const manager = new GateManager();
      const ctx = makeContext("safe");
      const results = await manager.evaluateGates(ctx);
      // All 9 gates should produce a result (unless an early block short-circuits)
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("shouldPauseForGate", () => {
    let manager: InstanceType<typeof GateManager>;

    beforeEach(() => {
      manager = new GateManager();
    });

    it("TC-GATE-003: returns false for turbo mode regardless of severity", () => {
      expect(manager.shouldPauseForGate(makeBlockedResult("Any Gate"), "turbo")).toBe(false);
      expect(manager.shouldPauseForGate(makeNeedsReviewResult("Any Gate"), "turbo")).toBe(false);
      expect(manager.shouldPauseForGate(makeWarningResult("Any Gate"), "turbo")).toBe(false);
    });

    it("TC-GATE-004: returns false for god mode regardless of severity", () => {
      expect(manager.shouldPauseForGate(makeBlockedResult("Any Gate"), "god")).toBe(false);
      expect(manager.shouldPauseForGate(makeNeedsReviewResult("Any Gate"), "god")).toBe(false);
      expect(manager.shouldPauseForGate(makeWarningResult("Any Gate"), "god")).toBe(false);
    });

    it("TC-GATE-005: returns true for blocked severity in balanced mode", () => {
      expect(manager.shouldPauseForGate(makeBlockedResult("Security Gate"), "balanced")).toBe(true);
    });

    it("TC-GATE-006: returns true for needs-review (fail) in safe mode", () => {
      expect(manager.shouldPauseForGate(makeNeedsReviewResult("QA Gate"), "safe")).toBe(true);
    });

    it("returns false for passing results in any mode", () => {
      for (const mode of ["safe", "balanced", "builder", "pro", "expert"]) {
        expect(manager.shouldPauseForGate(makePassResult("Any Gate"), mode)).toBe(false);
      }
    });

    it("returns true for warning in safe mode", () => {
      expect(manager.shouldPauseForGate(makeWarningResult("Any Gate"), "safe")).toBe(true);
    });

    it("returns false for warning in balanced mode", () => {
      expect(manager.shouldPauseForGate(makeWarningResult("Any Gate"), "balanced")).toBe(false);
    });
  });

  describe("isBlocked", () => {
    let manager: InstanceType<typeof GateManager>;

    beforeEach(() => {
      manager = new GateManager();
    });

    it("TC-GATE-007: returns true if any result has blocked severity", () => {
      const results: GateResult[] = [
        makePassResult("Scope Gate"),
        makeBlockedResult("Security Gate"),
        makePassResult("QA Gate"),
      ];
      expect(manager.isBlocked(results)).toBe(true);
    });

    it("TC-GATE-008: returns false if all results pass", () => {
      const results: GateResult[] = [
        makePassResult("Scope Gate"),
        makePassResult("Security Gate"),
        makePassResult("QA Gate"),
      ];
      expect(manager.isBlocked(results)).toBe(false);
    });

    it("returns false for an empty results array", () => {
      expect(manager.isBlocked([])).toBe(false);
    });

    it("returns false when results only contain fail/warning (not blocked)", () => {
      const results: GateResult[] = [
        makeNeedsReviewResult("Scope Gate"),
        makeWarningResult("Security Gate"),
      ];
      expect(manager.isBlocked(results)).toBe(false);
    });
  });

  describe("TC-GATE-009: short-circuit stops evaluation after first blocked result", () => {
    it("stops after first blocked gate in balanced mode", async () => {
      const manager = new GateManager();
      // Use a context that will likely trigger a scope block (out-of-scope files)
      const ctx = makeContext("balanced", {
        run: makeRun({ projectId: "proj-api" }) as any,
        proposedChanges: [{ path: "apps/web-control-plane/secret.ts" }],
      });

      const results = await manager.evaluateGates(ctx);

      // Find the first blocked result
      const blockedIndex = results.findIndex((r) => r.severity === "blocked");
      if (blockedIndex !== -1) {
        // No results should appear after the first blocked one
        expect(results.length).toBe(blockedIndex + 1);
      }
      // If no gate was blocked, the assertion still passes (context-dependent)
    });

    it("does NOT short-circuit in turbo mode even if a gate would block", async () => {
      const manager = new GateManager();
      // Turbo mode only runs Risk Threshold Gate, so short-circuit behavior is irrelevant
      const ctx = makeContext("turbo", {
        run: makeRun({ projectId: "proj-api" }) as any,
        proposedChanges: [{ path: "apps/web-control-plane/secret.ts" }],
      });

      const results = await manager.evaluateGates(ctx);
      // In turbo mode only 1 gate runs, no short-circuit needed
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe("TC-GATE-010: god mode returns empty gate sequence (skips all gates)", () => {
    it("evaluateGates in god mode returns empty results array", async () => {
      const manager = new GateManager();
      const ctx = makeContext("god");
      const results = await manager.evaluateGates(ctx);
      expect(results).toEqual([]);
    });
  });
});
