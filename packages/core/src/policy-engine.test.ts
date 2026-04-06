import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluatePolicy, loadPolicyProfile } from "./policy-engine";

const policyPath = path.resolve("config/policy.json");
const backupPath = `${policyPath}.bak`;

function writePolicy(content: string) {
  fs.mkdirSync(path.dirname(policyPath), { recursive: true });
  fs.writeFileSync(policyPath, content, "utf-8");
}

describe("Policy Engine", () => {
  let originalPolicy: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(policyPath)) {
      originalPolicy = fs.readFileSync(policyPath, "utf-8");
    } else {
      originalPolicy = null;
    }
  });

  afterEach(() => {
    if (originalPolicy === null) {
      if (fs.existsSync(policyPath)) fs.unlinkSync(policyPath);
    } else {
      fs.writeFileSync(policyPath, originalPolicy, "utf-8");
    }
    vi.restoreAllMocks();
  });

  it("should load legacy restriction-based policy config", () => {
    writePolicy(JSON.stringify({
      mode: "balanced",
      restrictions: [
        { adapterId: "terminal", blacklist: ["rm -rf /"], requiresApproval: true },
        { adapterId: "github", requiresApproval: true },
        { adapterId: "file-system", requiresApproval: false },
      ],
    }, null, 2));

    const policy = loadPolicyProfile();
    expect(policy.mode).toBe("balanced");
    expect(policy.rules.blockCommands).toContain("rm -rf /");
    expect(policy.rules.requireApprovalFor).toContain("github");
    expect(policy.rules.allowRollback).toBe(true);
  });

  it("should require approval for GitHub tasks in legacy config", () => {
    writePolicy(JSON.stringify({
      mode: "balanced",
      restrictions: [
        { adapterId: "github", requiresApproval: true },
      ],
    }, null, 2));

    const result = evaluatePolicy({ adapterId: "github", payload: { action: "commit" }, requiresApproval: false } as any);
    expect(result.requiresApproval).toBe(true);
    expect(result.allowed).toBe(true);
  });

  it("should block blacklisted terminal commands", () => {
    writePolicy(JSON.stringify({
      restrictions: [
        { adapterId: "terminal", blacklist: ["rm -rf /"], requiresApproval: true },
      ],
    }, null, 2));

    const result = evaluatePolicy({ adapterId: "terminal", payload: { command: "rm -rf /tmp" }, requiresApproval: false } as any);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Blocked by safety policy");
  });
});
