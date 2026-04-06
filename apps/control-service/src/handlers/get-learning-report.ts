import type { Request, Response } from "express";
import { getLearningReport } from "../services/learning-service.js";
import { sendInternalError } from "../lib/handler-utils.js";

/**
 * GET /v1/learning/report
 * Get comprehensive learning report about system patterns and improvements.
 */
export async function getLearningReportHandler(req: Request, res: Response) {
  try {
    const report = getLearningReport();
    res.json(report);
  } catch (err: any) {
    return sendInternalError(res, err, "get_learning_report");
  }
}
