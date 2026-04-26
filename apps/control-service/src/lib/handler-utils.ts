import type { Request, Response } from "express";
import { logger } from "./logger.js";

/**
 * Standard auth context extracted from Express request.
 * Provides type-safe access to actor and tenant information.
 */
export interface AuthContext {
  actor: {
    id: string;
    name: string;
    type: string;
    authMode: string;
  };
  tenant: {
    orgId: string;
    workspaceId: string;
    projectId: string;
  };
}

/**
 * Extract and normalize auth context from Express request.
 * Ensures consistent auth extraction across all handlers.
 *
 * Throws if auth information is missing (should not happen
 * if authenticate middleware is applied).
 */
export function extractAuthContext(req: Request): AuthContext {
  const auth = req.auth;

  if (!auth) {
    throw new Error("Authentication context not found in request");
  }

  return {
    actor: {
      id: auth.actor?.actorId || "unknown",
      name: auth.actor?.actorName || "Unknown Actor",
      type: auth.actor?.actorType || "unknown",
      authMode: auth.actor?.authMode || "bearer-session",
    },
    tenant: {
      orgId: auth.tenant?.orgId || "unknown",
      workspaceId: auth.tenant?.workspaceId || "unknown",
      projectId: auth.tenant?.projectId || "unknown",
    },
  };
}

/**
 * Extract run ID from request parameters.
 * Validates that the ID exists and is a non-empty string.
 */
export function extractRunId(req: Request): string {
  const runId = req.params.id || req.params.runId;
  if (!runId || typeof runId !== "string") {
    throw new Error("Invalid or missing run ID");
  }
  return runId;
}

/**
 * Extract gate ID from request parameters.
 * Validates that the ID exists and is a non-empty string.
 */
export function extractGateId(req: Request): string {
  const gateId = req.params.id;
  if (!gateId || typeof gateId !== "string") {
    throw new Error("Invalid or missing gate ID");
  }
  return gateId;
}

/**
 * Standard error response format.
 * Used consistently across all error responses.
 */
export interface ErrorResponse {
  error: string;
  context?: string;
  details?: Record<string, any>;
}

/**
 * Send an error response with standard format.
 * Always logs the error for debugging.
 */
export function sendError(
  res: Response,
  statusCode: number,
  error: Error | string,
  context?: string,
  details?: Record<string, any>
): void {
  const message = typeof error === "string" ? error : error.message;

  logger.error(
    { error: message, context, statusCode },
    "Handler error"
  );

  const errorResponse: ErrorResponse = {
    error: message,
    ...(context && { context }),
    ...(details && { details }),
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Send a 400 Bad Request error.
 */
export function sendBadRequest(
  res: Response,
  message: string,
  details?: Record<string, any>
): void {
  sendError(res, 400, message, "bad_request", details);
}

/**
 * Send a 403 Forbidden error.
 */
export function sendForbidden(
  res: Response,
  message: string,
  context?: string
): void {
  sendError(res, 403, message, context || "forbidden");
}

/**
 * Send a 404 Not Found error.
 */
export function sendNotFound(
  res: Response,
  message: string,
  resourceType?: string
): void {
  sendError(res, 404, message, `${resourceType || "resource"}_not_found`);
}

/**
 * Send a 409 Conflict error.
 */
export function sendConflict(
  res: Response,
  message: string,
  details?: Record<string, any>
): void {
  sendError(res, 409, message, "conflict", details);
}

/**
 * Send a 500 Internal Server Error.
 */
export function sendInternalError(
  res: Response,
  error: Error,
  context?: string
): void {
  sendError(res, 500, error, context || "internal_error");
}

/**
 * Wrapper for async handler functions.
 * Catches errors and sends appropriate error response.
 *
 * Usage:
 *   app.get("/api/resource", asyncHandler(async (req, res) => {
 *     const auth = extractAuthContext(req);
 *     const resource = await getResource();
 *     res.json(resource);
 *   }));
 */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      sendInternalError(res, err, "async_handler_error");
    }
  };
}

/**
 * Validate cross-tenant access.
 * Ensures the run belongs to the requester's organization.
 *
 * Throws if tenant check fails.
 */
export function validateTenantAccess(
  resourceOrgId: string | undefined,
  context: AuthContext
): void {
  if (resourceOrgId && resourceOrgId !== context.tenant.orgId) {
    throw new Error(
      "Access denied: resource belongs to a different organization"
    );
  }
}
