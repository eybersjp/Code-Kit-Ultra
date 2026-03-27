import { listAdapters } from "./registry";
import type { AdapterHealth } from "../../shared/src/types";

export async function checkAllAdapters(): Promise<AdapterHealth[]> {
  const adapters = listAdapters();
  const results: AdapterHealth[] = [];

  for (const adapter of adapters) {
    const config = await adapter.validateConfig();
    const health = await adapter.healthCheck();
    results.push({
      ...health,
      ok: health.ok && config.valid,
      configured: config.valid,
      message: `${health.message} ${config.message}`.trim(),
    });
  }

  return results;
}
