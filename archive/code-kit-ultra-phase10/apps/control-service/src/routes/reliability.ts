import { Router } from "express";
import { ReliabilityScorer } from "@code-kit/reliability";

const router = Router();

// GET /v1/learning/reliability/:adapterId - Get reliability metrics for an adapter
router.get("/:adapterId", (req, res) => {
  const metrics = ReliabilityScorer.getReliability(req.params.adapterId);
  if (metrics) {
    res.json(metrics);
  } else {
    res.status(404).json({ error: "Adapter reliability not found" });
  }
});

// GET /v1/learning/reliability - Get all metrics (placeholder)
router.get("/", (req, res) => {
  res.json({ reliability: [] });
});

export const reliabilityRouter = router;
