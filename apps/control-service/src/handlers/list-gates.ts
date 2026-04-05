import type { Request, Response } from "express";
import { ApprovalService } from "../services/approval-service.js";
import { sendInternalError } from "../lib/handler-utils.js";

/**
 * GET /v1/gates
 * Get list of all open approvals (gates awaiting review).
 */
export async function listGatesHandler(req: Request, res: Response) {
  try {
    const approvals = ApprovalService.getApprovals();
    res.json(approvals);
  } catch (err: any) {
    return sendInternalError(res, err, "list_gates");
  }
}
