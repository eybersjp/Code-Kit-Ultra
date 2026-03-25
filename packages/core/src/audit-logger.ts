import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AuditEvent, AuditLogArtifact, Role } from "../../shared/src/types";

function ensureDir(runId: string): string {
  const dir = path.resolve(`.codekit/runs/${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function auditPath(runId: string): string {
  return path.join(ensureDir(runId), "audit-log.json");
}

function globalAuditDir(): string {
  const dir = path.resolve(".codekit/audit");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function globalAuditPath(): string {
  return path.join(globalAuditDir(), "events.ndjson");
}

export function loadAuditLog(runId: string): AuditLogArtifact {
  const file = auditPath(runId);
  if (!fs.existsSync(file)) {
    const now = new Date().toISOString();
    return {
      runId,
      createdAt: now,
      updatedAt: now,
      events: [],
    };
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as AuditLogArtifact;
}

export function saveAuditLog(log: AuditLogArtifact): void {
  fs.writeFileSync(auditPath(log.runId), JSON.stringify(log, null, 2), "utf-8");
}

function hashEventBody(body: Omit<AuditEvent, "hash">): string {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export function appendAuditEvent(input: {
  runId: string;
  actor: string;
  role: Role | "system";
  action: string;
  stepId?: string;
  details?: Record<string, unknown>;
}): AuditEvent {
  const log = loadAuditLog(input.runId);
  const prevEvent = log.events.at(-1);
  const prevHash = prevEvent?.hash ?? "GENESIS_BLOCK";

  const body: Omit<AuditEvent, "hash"> = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runId: input.runId,
    actor: input.actor,
    role: input.role,
    action: input.action,
    stepId: input.stepId,
    details: input.details,
    prevHash,
  };

  const event: AuditEvent = {
    ...body,
    hash: hashEventBody(body),
  };

  log.events.push(event);
  log.updatedAt = event.timestamp;
  saveAuditLog(log);

  // Also append to global tamper-proof stream
  fs.appendFileSync(globalAuditPath(), JSON.stringify(event) + "\n", "utf-8");

  return event;
}
