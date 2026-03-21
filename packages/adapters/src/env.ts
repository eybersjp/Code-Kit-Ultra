import { loadAdapterConfig } from "./config";
export function validateAllAdapterEnv() {
  const cfg = loadAdapterConfig();
  return Object.entries(cfg.adapters).map(([name, item]) => {
    const missing = item.requiredEnv.filter((key) => !process.env[key]);
    return { name, ok: missing.length === 0 || item.type === "stub", missing };
  });
}