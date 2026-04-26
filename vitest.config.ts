import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "packages/shared/src"),
      "@audit": path.resolve(__dirname, "packages/audit/src"),
      "@orchestrator": path.resolve(__dirname, "packages/orchestrator/src"),
      "@governance": path.resolve(__dirname, "packages/governance/src"),
      "@memory": path.resolve(__dirname, "packages/memory/src"),
      "@core": path.resolve(__dirname, "packages/core/src"),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/test/**",
        "apps/web-control-plane/**",
        "apps/cli/**",
      ],
    },
    environment: "node",
    alias: {
      pino: new URL("./test/pino-mock.ts", import.meta.url).pathname,
    },
  },
});
