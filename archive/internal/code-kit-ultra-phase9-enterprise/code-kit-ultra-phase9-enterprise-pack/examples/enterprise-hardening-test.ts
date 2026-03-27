import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createControlServiceServer } from "../packages/control-service/src/server";
import { initRun } from "../packages/orchestrator/src/index";

async function main() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "ck-phase9-"));
  process.chdir(tempDir);

  const run = await initRun({
    idea: "Build a governed internal app with approval checkpoints",
    mode: "safe",
    allowCommandExecution: false,
  });

  const server = createControlServiceServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const unauthRuns = await fetch(`${baseUrl}/runs`);
  assert.equal(unauthRuns.status, 403);

  const viewerRuns = await fetch(`${baseUrl}/runs`, { headers: { "x-api-key": "viewer-key" } });
  assert.equal(viewerRuns.status, 200);

  const viewerRollback = await fetch(`${baseUrl}/runs/${run.state.runId}/rollback-step`, {
    method: "POST",
    headers: { "x-api-key": "viewer-key", "Content-Type": "application/json" },
    body: JSON.stringify({ stepId: run.plan.tasks[0]?.id }),
  });
  assert.equal(viewerRollback.status, 403);

  const reviewerApproval = await fetch(`${baseUrl}/runs/${run.state.runId}/approve`, {
    method: "POST",
    headers: { "x-api-key": "reviewer-key" },
  });
  assert.equal(reviewerApproval.status, 200);

  const auditResp = await fetch(`${baseUrl}/runs/${run.state.runId}/audit`, { headers: { "x-api-key": "viewer-key" } });
  assert.equal(auditResp.status, 200);
  const audit = await auditResp.json() as { events: Array<{ hash: string; prevHash: string }> };
  assert.ok(audit.events.length >= 2);
  assert.equal(audit.events[0]?.prevHash, "GENESIS");

  const metricsResp = await fetch(`${baseUrl}/metrics`, { headers: { "x-api-key": "viewer-key" } });
  assert.equal(metricsResp.status, 200);
  const metrics = await metricsResp.json() as { totalRuns: number };
  assert.ok(metrics.totalRuns >= 1);

  const policyResp = await fetch(`${baseUrl}/policy`, { headers: { "x-api-key": "viewer-key" } });
  const policy = await policyResp.json() as { rules: { blockCommands: string[] } };
  assert.ok(policy.rules.blockCommands.includes("rm -rf /"));

  server.close();
  rmSync(tempDir, { recursive: true, force: true });
  console.log("enterprise hardening test passed");
}

void main();
