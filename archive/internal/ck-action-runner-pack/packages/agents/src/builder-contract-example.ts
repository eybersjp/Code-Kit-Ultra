import type { BuilderActionBatch } from "./action-types";

export const exampleBuilderBatch: BuilderActionBatch = {
  runId: "run_example123",
  phase: "build",
  generatedBy: "builder",
  summary: "Create starter project structure and install dependencies.",
  actions: [
    {
      type: "create_dir",
      path: "src/components",
      reason: "Create component directory",
    },
    {
      type: "write_file",
      path: "src/index.ts",
      content: "export const boot = () => console.log('Code Kit Ultra');\n",
      reason: "Create application entry file",
    },
    {
      type: "run_command",
      command: "npm install",
      cwd: ".",
      reason: "Install project dependencies",
    },
  ],
  recommendations: [
    "Review generated files before commit",
    "Run tests after dependency installation",
  ],
};
