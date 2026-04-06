import type { Request, Response } from "express";
import { getAdaptivePolicies } from "../services/learning-service.js";
import { sendInternalError } from "../lib/handler-utils.js";

/**
 * GET /v1/learning/policies
 * Get adaptive policies that have been learned from system execution.
 */
export async function getLearningPoliciesHandler(req: Request, res: Response) {
  try {
    const policies = getAdaptivePolicies();
    res.json(policies);
  } catch (err: any) {
    return sendInternalError(res, err, "get_learning_policies");
  }
}
