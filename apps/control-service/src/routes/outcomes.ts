import { Router } from "express";
import { OutcomeCapturer } from "@code-kit/outcomes";

const router = Router();

// POST /v1/outcomes - Record a new outcome
router.post("/", async (req, res) => {
  try {
    const outcome = OutcomeCapturer.normalize(req.body);
    await OutcomeCapturer.record(outcome);
    res.status(201).json(outcome);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /v1/outcomes/:id - Get outcome for a run
router.get("/:runId", async (req, res) => {
  // Placeholder implementation
  res.json({ message: "Lookup for run outcome not implemented yet." });
});

export const outcomeRouter = router;
