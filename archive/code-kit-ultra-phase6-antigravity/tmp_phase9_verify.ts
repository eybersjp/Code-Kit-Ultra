import { recommendAdapters, selectBestAdapter, getAvailableAdapters } from "./packages/orchestrator/src"; // Wait, I put them in a new package? No, I put them in packages/adapters/src

// Let's use relative imports for the test script
import { recommendAdapters as recommend, selectBestAdapter as select } from "./packages/adapters/src/index";

async function main() {
  console.log("Starting Phase 9 Adapter Verification...");

  const cases = [
    {
      label: "Planning Case",
      request: {
        projectIdea: "Define the system architecture for a high-volume CRM",
        preferredAction: "plan" as const
      }
    },
    {
      label: "Refactor Case",
      request: {
        projectIdea: "Refactor the authentication layer to use shared types",
        preferredAction: "refactor" as const
      }
    },
    {
      label: "Shipping Case",
      request: {
        projectIdea: "Build a full-stack SaaS MVP for solar installers",
        preferredAction: "ship-mvp" as const
      }
    }
  ];

  for (const c of cases) {
    console.log(`\n--- Case: ${c.label} ---`);
    console.log(`Idea: ${c.request.projectIdea}`);
    console.log(`Action: ${c.request.preferredAction}`);

    const recommendations = recommend(c.request);
    const best = select(c.request);

    console.log("\nRecommendations (Sorted):");
    recommendations.forEach(r => {
      console.log(`- ${r.adapterName} (Score: ${r.fitScore}, Rec: ${r.recommended})`);
      console.log(`  Reason: ${r.reason}`);
    });

    console.log(`\nWinner: ${best.name}`);
    
    const mock = best.executeMock(c.request);
    console.log(`Mock Action: ${mock.mockAction}`);
    console.log(`Mock Summary: ${mock.summary}`);
  }

  console.log("\nPhase 9 Verification Complete.");
}

main().catch(console.error);
