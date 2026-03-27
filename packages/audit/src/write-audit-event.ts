import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type AuditEvent, type ActorType } from "../../shared/src/types.js";
import { appendAuditEvent } from "../../core/src/audit-logger.js";

function globalAuditDir(): string {
  const dir = path.resolve(".codekit/audit");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function globalAuditPath(): string {
  return path.join(globalAuditDir(), "events.ndjson");
}

export interface WriteAuditParams {
  action: string;
  actorId?: string;
  actorType?: ActorType | string;
  authMode?: string;
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
  runId?: string;
  correlationId?: string;
  resourceType?: string;
  resourceId?: string;
  result?: "success" | "failure" | "pending";
  details?: Record<string, unknown>;
  
  // legacy compat
  actorName?: string;
  role?: string;
  stepId?: string;
}

function hashEventBody(body: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

let lastHash = "GENESIS_BLOCK";

export function writeAuditEvent(params: WriteAuditParams): AuditEvent {
  const file = globalAuditPath();
  
  // Read last event hash to maintain chain for global log
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    if (lines.length > 0) {
       try {
         const lastLine = JSON.parse(lines[lines.length - 1]);
         if (lastLine.hash) lastHash = lastLine.hash;
       } catch (e) {
         // ignore
       }
    }
  }

  const timestamp = new Date().toISOString();
  
  const body: Omit<AuditEvent, "hash"> = {
    id: crypto.randomUUID(),
    timestamp,
    action: params.action,
    actor: params.actorName || params.actorId || "system",
    role: (params.role as any) || "system",
    
    actorId: params.actorId || undefined,
    actorType: (params.actorType as ActorType) || undefined,
    authMode: params.authMode,
    orgId: params.orgId,
    workspaceId: params.workspaceId,
    projectId: params.projectId,
    runId: params.runId || "none",
    correlationId: params.correlationId,
    
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    result: params.result,
    
    stepId: params.stepId,
    details: params.details,
    prevHash: lastHash
  };

  const event: AuditEvent = {
    ...body,
    hash: hashEventBody(body)
  };
  
  lastHash = event.hash;
  fs.appendFileSync(file, JSON.stringify(event) + "\n", "utf-8");
  
  // If runId exists and isn't 'none', we also append to the run specific log in .codekit/runs/
  if (params.runId && params.runId !== "none") {
    try {
      // Use existing function from core to keep run-level hashes valid
      appendAuditEvent({
        runId: params.runId,
        actor: body.actor,
        role: body.role as any,
        action: params.action,
        stepId: params.stepId,
        details: {
          ...params.details,
          actorId: params.actorId,
          orgId: params.orgId,
          workspaceId: params.workspaceId,
          projectId: params.projectId,
          correlationId: params.correlationId,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          result: params.result
        }
      });
    } catch (e) {
       // fallback if the package doesn't load
    }
  }
  
  return event;
}
