import { Router } from "express";
import { getLearningReport } from "@code-kit/learning-engine";

const router = Router();

// GET /v1/learning/report - Get the collective intelligence report
router.get("/report", (req, res) => {
  try {
    const report = getLearningReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/learning/patterns - Get learned failure patterns
router.get("/patterns", (req, res) => {
  res.json({ patterns: [] }); // Placeholder
});

export const learningRouter = router;
