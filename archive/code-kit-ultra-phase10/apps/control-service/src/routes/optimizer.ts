import { Router } from "express";

const router = Router();

// GET /v1/learning/optimizer/decisions - Get historical optimization decisions
router.get("/decisions", (req, res) => {
  res.json({ decisions: [] });
});

export const optimizerRouter = router;
