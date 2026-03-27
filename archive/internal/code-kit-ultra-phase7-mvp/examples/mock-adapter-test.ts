import { createMockAdapters } from "../packages/adapters/src/mock-adapters";

const adapters = createMockAdapters();

if (!adapters.some((a) => a.canHandle("planning"))) {
  throw new Error("No adapter can handle planning");
}

const result = await adapters[0].execute({ hello: "world" }) as { status?: string };
if (result.status !== "simulated") {
  throw new Error("Mock adapter did not simulate execution");
}

console.log("Mock adapter test passed");
