import type { Request, Response } from "express";
import { RunReader } from "../services/run-reader.js";
import {
  extractRunId,
  sendNotFound,
  sendInternalError,
} from "../lib/handler-utils.js";

/**
 * GET /v1/runs/:id/timeline
 * Get the timeline (event log) for a specific run.
 */
export async function getTimelineHandler(req: Request, res: Response) {
  try {
    const runId = extractRunId(req);

    const timeline = RunReader.getTimeline(runId);
    if (!timeline) {
      return sendNotFound(res, "Timeline not found for run", "timeline");
    }

    res.json(timeline);
  } catch (err: any) {
    return sendInternalError(res, err, "get_timeline");
  }
}
