import express from "express";
import cors from "cors";
import chalk from "chalk";
import { outcomeRouter } from "./routes/outcomes.js";
import { learningRouter } from "./routes/learning.js";
import { reliabilityRouter } from "./routes/reliability.js";
import { policyRouter } from "./routes/policy-adaptations.js";
import { optimizerRouter } from "./routes/optimizer.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0-phase10" });
});

// Routes
app.use("/v1/outcomes", outcomeRouter);
app.use("/v1/learning", learningRouter);
app.use("/v1/learning/reliability", reliabilityRouter);
app.use("/v1/learning/adaptations", policyRouter);
app.use("/v1/learning/optimizer", optimizerRouter);

app.listen(PORT, () => {
  console.log(chalk.green(`\n🚀 Code Kit Control Service (Phase 10) running at http://localhost:${PORT}`));
});
