import { createProviderAdapters } from "../packages/adapters/src/index";

const adapters = createProviderAdapters();
const fsAdapter = adapters.find((adapter) => adapter.id === "fs");
const terminalAdapter = adapters.find((adapter) => adapter.id === "terminal");

if (!fsAdapter || !terminalAdapter) {
  throw new Error("Expected fs and terminal adapters to be registered.");
}

const valid = await fsAdapter.validate({ path: ".codekit/tmp/test.txt", content: "hello" });
if (!valid) {
  throw new Error("File system adapter validation failed unexpectedly.");
}

const result = await terminalAdapter.execute({ command: "echo", args: ["adapter test"], allowExecution: false });
if (!result.success) {
  throw new Error("Terminal adapter did not return success.");
}

console.log("Provider adapter test passed");
