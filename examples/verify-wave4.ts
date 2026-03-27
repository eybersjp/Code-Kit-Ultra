import { recordRun, loadProjectMemory } from "../packages/memory/src/run-store.js";
import type { RunReport } from "../packages/shared/src/types.js";

async function verifyWave4() {
  console.log("Wave 4 Verification: Multi-tenant and Actor Persistence Persistence Foundation");
  
  const mockReport: RunReport & { 
    orgId: string; 
    workspaceId: string; 
    projectId: string; 
    actorId: string; 
    actorType: string;
    correlationId: string;
    authMode: string;
  } = {
    id: `run-v4-${Date.now()}`,
    input: {
      idea: "Verify Wave 4 Persistence",
      mode: "turbo"
    },
    assumptions: [],
    clarifyingQuestions: [],
    plan: [],
    selectedSkills: [],
    gates: [],
    approvedGates: [],
    summary: "Seeded run for Wave 4 verification",
    overallGateStatus: "pass",
    currentPhase: "intake",
    completedPhases: [],
    status: "success",
    createdAt: new Date().toISOString(),
    
    // Scoped metadata (Wave 4)
    orgId: "org_dev_local",
    workspaceId: "ws_main",
    projectId: "proj_core",
    actorId: "user_dev_1",
    actorType: "user",
    authMode: "bearer-session",
    correlationId: "corr-12345"
  };

  console.log(`Recording run ${mockReport.id} with tenant context: ${mockReport.orgId}/${mockReport.projectId}`);
  
  const result = recordRun(mockReport as any);
  
  console.log(`Run recorded. Memory path: ${result.memoryPath}`);
  
  const memory = loadProjectMemory();
  const entry = memory.runs.find(r => r.id === mockReport.id);
  
  if (entry) {
    console.log("SUCCESS: Run entry found in memory store.");
    console.log("Tenant Metadata Check:");
    console.log(`- Org ID: ${entry.orgId === mockReport.orgId ? 'MATCH' : 'FAIL'} (${entry.orgId})`);
    console.log(`- Project ID: ${entry.projectId === mockReport.projectId ? 'MATCH' : 'FAIL'} (${entry.projectId})`);
    console.log(`- Actor ID: ${entry.actorId === mockReport.actorId ? 'MATCH' : 'FAIL'} (${entry.actorId})`);
    console.log(`- Auth Mode: ${entry.authMode === mockReport.authMode ? 'MATCH' : 'FAIL'} (${entry.authMode})`);
  } else {
    console.error("FAIL: Run entry not found.");
  }
}

verifyWave4().catch(console.error);
