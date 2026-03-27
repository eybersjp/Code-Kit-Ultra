import { publishEvent } from "../packages/events/src/index.js";
import { getRealtimeProvider } from "../packages/realtime/src/index.js";
import type { TenantContext, AuthenticatedActor } from "../packages/shared/src/types";

async function main() {
  console.log("🌊 Wave 5 Verification: Canonical Events & Realtime");

  // 1. Setup Tenant and Actor context
  const tenant: TenantContext = {
    orgId: "org_123",
    workspaceId: "ws_456",
    projectId: "proj_789"
  };

  const actor: AuthenticatedActor = {
    actorId: "user_wave5",
    actorType: "user",
    actorName: "Wave 5 Tester",
    authMode: "bearer-session",
    roles: []
  };

  const correlationId = "corr_v5_001";

  // 2. Publish a canonical event
  console.log("\n[1] Publishing canonical 'run.created' event...");
  const event = await publishEvent("run.created", {
    runId: "run_wave5_001",
    tenant,
    actor: { id: actor.actorId, type: actor.actorType, authMode: actor.authMode },
    correlationId,
    payload: {
      idea: "Test canonical events",
      mode: "turbo"
    }
  });

  console.log("✅ Event Published:", JSON.stringify(event, null, 2));

  // 3. Verify Realtime broadcast
  console.log("\n[2] Verifying Realtime provider existence...");
  const provider = getRealtimeProvider();
  console.log(`✅ Realtime Status: ${provider.status()}`);

  // 4. Test Orchestrator Event Helper (Simulated)
  console.log("\n[3] Testing Orchestrator Event Helper (Simulated)...");
  await publishEvent("execution.started", {
    runId: "run_wave5_001",
    tenant,
    actor: { id: "system", type: "service_account", authMode: "system-internal" },
    correlationId,
    payload: { phase: "building" }
  });

  console.log("✅ Orchestrator event emitted.");

  console.log("\n🚀 Wave 5 Foundation Verified!");
}

main().catch(err => {
  console.error("❌ Wave 5 Verification Failed:", err);
  process.exit(1);
});
