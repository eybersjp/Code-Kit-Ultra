import { Router } from "express";

const router = Router();

// GET /v1/learning/adaptations - Get applied policy adaptations
router.get("/", (req, res) => {
  res.json({ adaptations: [] });
});

export const policyRouter = router;
