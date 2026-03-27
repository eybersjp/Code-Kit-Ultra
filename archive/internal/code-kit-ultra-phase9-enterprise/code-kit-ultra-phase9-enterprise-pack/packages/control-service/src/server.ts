import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { appendAuditEvent } from "../../audit/src/index";
import { assertRole, resolveApiKeyUser } from "../../auth/src/index";
import type { AuthUser, Role } from "../../shared/src/types";
import {
  approveRun,
  getApproval,
  getAudit,
  getMetrics,
  getPolicy,
  getRun,
  listPendingApprovals,
  listRuns,
  resumeRunFromApi,
  retryRunStep,
  rollbackRunStep,
} from "./service";

interface JsonResponse {
  status?: number;
  body: unknown;
}

function sendJson(res: ServerResponse, payload: JsonResponse): void {
  res.writeHead(payload.status ?? 200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload.body, null, 2));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as Record<string, unknown>;
}

function getUser(req: IncomingMessage): AuthUser | null {
  const apiKey = req.headers["x-api-key"];
  return resolveApiKeyUser(typeof apiKey === "string" ? apiKey : Array.isArray(apiKey) ? apiKey[0] : null);
}

function requireRoles(user: AuthUser | null, allowed: Role[]): AuthUser {
  assertRole(user, allowed);
  return user;
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const parts = url.pathname.split("/").filter(Boolean);
  const user = getUser(req);

  try {
    if (method === "GET" && url.pathname === "/health") {
      return sendJson(res, { body: { ok: true, service: "control-service", auth: "api-key", phase: "9.0" } });
    }

    if (method === "GET" && url.pathname === "/metrics") {
      requireRoles(user, ["admin", "operator", "reviewer", "viewer"]);
      return sendJson(res, { body: getMetrics() });
    }

    if (method === "GET" && url.pathname === "/policy") {
      requireRoles(user, ["admin", "operator", "reviewer", "viewer"]);
      return sendJson(res, { body: getPolicy() });
    }

    if (method === "GET" && url.pathname === "/runs") {
      requireRoles(user, ["admin", "operator", "reviewer", "viewer"]);
      return sendJson(res, { body: listRuns() });
    }

    if (method === "GET" && url.pathname === "/approvals") {
      requireRoles(user, ["admin", "reviewer", "viewer"]);
      return sendJson(res, { body: listPendingApprovals() });
    }

    if (parts[0] === "runs" && parts[1]) {
      const runId = parts[1];

      if (method === "GET" && parts.length === 2) {
        requireRoles(user, ["admin", "operator", "reviewer", "viewer"]);
        return sendJson(res, { body: getRun(runId) });
      }

      if (method === "GET" && parts[2] === "approval") {
        requireRoles(user, ["admin", "reviewer", "viewer"]);
        return sendJson(res, { body: getApproval(runId) });
      }

      if (method === "GET" && parts[2] === "audit") {
        requireRoles(user, ["admin", "reviewer", "viewer"]);
        return sendJson(res, { body: getAudit(runId) });
      }

      if (method === "POST" && parts[2] == "approve") {
        const actor = requireRoles(user, ["admin", "reviewer"]);
        appendAuditEvent({ runId, actor: actor.id, role: actor.role, action: "API_APPROVE" });
        return sendJson(res, { body: await approveRun(runId) });
      }

      if (method === "POST" && parts[2] === "resume") {
        const actor = requireRoles(user, ["admin", "operator"]);
        appendAuditEvent({ runId, actor: actor.id, role: actor.role, action: "API_RESUME" });
        return sendJson(res, { body: await resumeRunFromApi(runId) });
      }

      if (method === "POST" && parts[2] === "retry-step") {
        const actor = requireRoles(user, ["admin", "operator"]);
        const body = await parseBody(req);
        appendAuditEvent({ runId, actor: actor.id, role: actor.role, action: "API_RETRY_STEP", stepId: typeof body.stepId === "string" ? body.stepId : undefined });
        return sendJson(res, { body: await retryRunStep(runId, typeof body.stepId === "string" ? body.stepId : undefined) });
      }

      if (method === "POST" && parts[2] === "rollback-step") {
        const actor = requireRoles(user, ["admin"]);
        const body = await parseBody(req);
        appendAuditEvent({ runId, actor: actor.id, role: actor.role, action: "API_ROLLBACK_STEP", stepId: typeof body.stepId === "string" ? body.stepId : undefined });
        return sendJson(res, { body: await rollbackRunStep(runId, typeof body.stepId === "string" ? body.stepId : undefined) });
      }
    }

    return sendJson(res, { status: 404, body: { error: "Not found" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return sendJson(res, { status, body: { error: message } });
  }
}

export function createControlServiceServer() {
  return http.createServer((req, res) => {
    void route(req, res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.CONTROL_SERVICE_PORT ?? 4317);
  const server = createControlServiceServer();
  server.listen(port, () => {
    console.log(`Code Kit control-service listening on http://127.0.0.1:${port}`);
  });
}
