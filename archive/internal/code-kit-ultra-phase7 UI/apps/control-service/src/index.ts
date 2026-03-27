import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/runs", (req, res) => {
  res.json([
    { id: "run1", status: "running", phase: "planning" }
  ]);
});

app.get("/approvals", (req, res) => {
  res.json([
    { id: "a1", runId: "run1", gate: "deployment", riskLevel: "high" }
  ]);
});

app.post("/approvals/:id/approve", (req, res) => {
  res.json({ success: true });
});

app.post("/approvals/:id/reject", (req, res) => {
  res.json({ success: true });
});

app.listen(4000, () => {
  console.log("Control service running on port 4000");
});
