import { describe, it, expect } from "vitest";
import { evaluateConstraints } from "./constraint-engine";
import type { ConstraintPolicy } from "./constraint-engine";
import type { BuilderActionBatch } from "../../agents/src/action-types";

const validBatch: BuilderActionBatch = {
  id: "batch-001",
  actions: [
    {
      id: "action-1",
      type: "create_file",
      path: "/src/file1.ts",
      content: "console.log('test');",
      description: "Create test file",
    },
  ],
  description: "Test batch",
  mode: "builder",
  timestamp: Date.now(),
  runId: "run-001",
};

const defaultPolicy: ConstraintPolicy = {
  allowedPaths: ["/src", "/test", "/config"],
  blockedPaths: ["/node_modules", "/.git"],
  blockedActionTypes: ["dangerous_command"],
  blockedCommandPatterns: ["rm -rf", "sudo"],
  maxFilesChanged: 10,
  maxCommands: 5,
  maxActions: 20,
};

describe("evaluateConstraints", () => {
  // TC-CONSTRAINT-001: No constraints violated → pass
  it("should return valid when no constraints are violated", () => {
    const result = evaluateConstraints(validBatch, defaultPolicy);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.summary).toContain("satisfies");
  });

  // TC-CONSTRAINT-002: Blocked action type in plan → fail
  it("should detect blocked action types", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        ...validBatch.actions,
        {
          id: "action-2",
          type: "dangerous_command",
          description: "Dangerous action",
        } as any,
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "BLOCKED_ACTION_TYPE")).toBe(true);
  });

  // Path constraints
  it("should detect paths not in allowed list", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "create_file",
          path: "/forbidden/file.ts",
          content: "test",
          description: "Create file in forbidden path",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "PATH_NOT_ALLOWED")).toBe(true);
  });

  it("should detect blocked paths", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "create_file",
          path: "/node_modules/package.ts",
          content: "test",
          description: "Create file in node_modules",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "PATH_NOT_ALLOWED")).toBe(true);
  });

  // Command pattern blocking
  it("should detect blocked command patterns (rm -rf)", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "run_command",
          command: "rm -rf /src",
          description: "Dangerous command",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "BLOCKED_COMMAND_PATTERN")).toBe(true);
  });

  it("should detect blocked command patterns (sudo)", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "run_command",
          command: "sudo apt-get install package",
          description: "Sudo command",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "BLOCKED_COMMAND_PATTERN")).toBe(true);
  });

  // File count limits
  it("should detect exceeding maxFilesChanged", () => {
    const actions = Array.from({ length: 11 }, (_, i) => ({
      id: `action-${i}`,
      type: "create_file",
      path: `/src/file${i}.ts`,
      content: "test",
      description: `Create file ${i}`,
    }));
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: actions as any,
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "MAX_FILES_CHANGED_EXCEEDED")).toBe(true);
  });

  // Command count limits
  it("should detect exceeding maxCommands", () => {
    const actions = Array.from({ length: 6 }, (_, i) => ({
      id: `action-${i}`,
      type: "run_command",
      command: `echo "test${i}"`,
      description: `Command ${i}`,
    }));
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: actions as any,
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "MAX_COMMANDS_EXCEEDED")).toBe(true);
  });

  // Action count limits
  it("should detect exceeding maxActions", () => {
    const actions = Array.from({ length: 21 }, (_, i) => ({
      id: `action-${i}`,
      type: "create_file",
      path: `/src/file${i}.ts`,
      content: "test",
      description: `Create file ${i}`,
    }));
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: actions as any,
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "MAX_ACTIONS_EXCEEDED")).toBe(true);
  });

  // No policy constraints
  it("should allow all actions when no restrictions are set", () => {
    const permissivePolicy: ConstraintPolicy = {};
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "run_command",
          command: "rm -rf /",
          description: "Dangerous command",
        },
      ],
    };
    const result = evaluateConstraints(batch, permissivePolicy);
    expect(result.valid).toBe(true);
  });

  // Multiple violations
  it("should report all violations in a batch", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "dangerous_command",
          description: "Dangerous action",
        } as any,
        {
          id: "action-2",
          type: "create_file",
          path: "/forbidden/file.ts",
          content: "test",
          description: "Forbidden path",
        },
        {
          id: "action-3",
          type: "run_command",
          command: "sudo rm -rf /",
          description: "Multiple violations",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(1);
  });

  // Case insensitive pattern matching
  it("should match patterns case-insensitively", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "run_command",
          command: "RM -RF /src",
          description: "Dangerous command with uppercase",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === "BLOCKED_COMMAND_PATTERN")).toBe(true);
  });

  // Allowed paths with prefixes
  it("should allow paths matching allowed prefixes", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "create_file",
          path: "/test/subdir/file.ts",
          content: "test",
          description: "Create file in allowed test directory",
        },
        {
          id: "action-2",
          type: "create_file",
          path: "/config/settings.json",
          content: '{}',
          description: "Create file in allowed config directory",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(true);
  });

  // Empty policy
  it("should allow batch with empty policy", () => {
    const result = evaluateConstraints(validBatch, {});
    expect(result.valid).toBe(true);
  });

  // Summary message includes violation count
  it("should include violation count in summary", () => {
    const batch: BuilderActionBatch = {
      ...validBatch,
      actions: [
        {
          id: "action-1",
          type: "dangerous_command",
          description: "Dangerous action",
        } as any,
        {
          id: "action-2",
          type: "run_command",
          command: "sudo test",
          description: "Sudo command",
        },
      ],
    };
    const result = evaluateConstraints(batch, defaultPolicy);
    expect(result.valid).toBe(false);
    expect(result.summary).toContain("2 constraint");
  });
});
