import { once } from "node:events";
import { initRun } from "../packages/orchestrator/src/index";
import { createControlServiceServer } from "../packages/control-service/src/server";

async function main(): Promise<void> {
  const bundle = await initRun({
    idea: "Build a governed internal app with approval checkpoints",
    mode: "balanced",
    skillLevel: "advanced",
    priority: "quality",
    deliverable: "internal-tool",
  });

  const server = createControlServiceServer();
  server.listen(0);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve control-service port.");
  }
  const base = `http://127.0.0.1:${address.port}`;
  const viewerHeaders = { "x-api-key": "viewer-key" };

  const health = await fetch(`${base}/health`).then((r) => r.json() as Promise<{ ok: boolean }>);
  if (!health.ok) throw new Error("Health endpoint failed.");

  const runs = await fetch(`${base}/runs`, { headers: viewerHeaders }).then((r) => r.json() as Promise<Array<{ runId: string }>>);
  if (!runs.find((run) => run.runId === bundle.state.runId)) {
    throw new Error("Run not returned by /runs endpoint.");
  }

  const approvals = await fetch(`${base}/approvals`, { headers: { "x-api-key": "reviewer-key" } }).then((r) =>
    r.json() as Promise<Array<{ runId: string }>>,
  );
  if (!approvals.find((run) => run.runId === bundle.state.runId)) {
    throw new Error("Approval not returned by /approvals endpoint.");
  }

  const approvedRun = await fetch(`${base}/runs/${bundle.state.runId}/approve`, {
    method: "POST",
    headers: { "x-api-key": "reviewer-key" },
  }).then((r) => r.json() as Promise<{ state: { status: string } }>);

  server.close();

  if (approvedRun.state.status !== "completed") {
    throw new Error(`Expected completed status after approve, got ${approvedRun.state.status}`);
  }

  console.log("Control-service API test OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
