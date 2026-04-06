import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { appendAuditEvent, loadAuditLog } from "./audit-logger";

const runId = "test-run-audit";
const runAuditPath = path.resolve(`.codekit/runs/${runId}/audit-log.json`);
const globalAuditPath = path.resolve(".codekit/audit/events.ndjson");

function cleanup() {
  if (fs.existsSync(runAuditPath)) fs.unlinkSync(runAuditPath);
  const runDir = path.dirname(runAuditPath);
  if (fs.existsSync(runDir)) fs.rmdirSync(runDir, { recursive: true });
  if (fs.existsSync(globalAuditPath)) {
    fs.unlinkSync(globalAuditPath);
    const auditDir = path.dirname(globalAuditPath);
    if (fs.existsSync(auditDir)) fs.rmdirSync(auditDir, { recursive: true });
  }
}

describe("Audit Logger", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("should append an audit event to both run and global logs", () => {
    const event = appendAuditEvent({
      runId,
      actor: "tester",
      role: "system",
      action: "TEST_EVENT",
      details: { note: "phase2 test" },
    });

    expect(event.runId).toBe(runId);
    expect(fs.existsSync(runAuditPath)).toBe(true);
    expect(fs.existsSync(globalAuditPath)).toBe(true);

    const loaded = loadAuditLog(runId);
    expect(loaded.events).toHaveLength(1);
    expect(loaded.events[0].hash).toBeDefined();
    expect(loaded.events[0].action).toBe("TEST_EVENT");

    const globalContent = fs.readFileSync(globalAuditPath, "utf-8");
    expect(globalContent.trim().split("\n")).toHaveLength(1);
    expect(globalContent).toContain("TEST_EVENT");
  });
});
