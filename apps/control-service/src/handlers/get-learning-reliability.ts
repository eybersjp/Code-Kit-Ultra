import type { Request, Response } from "express";
import { getReliability } from "../services/learning-service.js";
import { sendInternalError } from "../lib/handler-utils.js";

/**
 * GET /v1/learning/reliability
 * Get reliability metrics and statistics.
 */
export async function getLearningReliabilityHandler(req: Request, res: Response) {
  try {
    const reliability = getReliability();
    res.json(reliability);
  } catch (err: any) {
    return sendInternalError(res, err, "get_learning_reliability");
  }
}
