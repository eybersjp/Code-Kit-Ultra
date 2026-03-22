export type {
  AdapterCapability,
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

export { antigravityAdapter } from "./antigravity-adapter";
export { cursorAdapter } from "./cursor-adapter";
export { windsurfAdapter } from "./windsurf-adapter";

import type { AdapterExecutionRequest, AdapterRecommendation, PlatformAdapter } from "./types";
import { antigravityAdapter } from "./antigravity-adapter";
import { cursorAdapter } from "./cursor-adapter";
import { windsurfAdapter } from "./windsurf-adapter";

export function getAvailableAdapters(): PlatformAdapter[] {
  return [antigravityAdapter, cursorAdapter, windsurfAdapter];
}

export function recommendAdapters(input: AdapterExecutionRequest): AdapterRecommendation[] {
  return getAvailableAdapters()
    .filter((adapter) => adapter.canHandle(input))
    .map((adapter) => adapter.recommend(input))
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function selectBestAdapter(input: AdapterExecutionRequest): PlatformAdapter {
  const recommendations = recommendAdapters(input);
  const best = recommendations[0];

  return (
    getAvailableAdapters().find((adapter) => adapter.id === best?.adapterId) ??
    antigravityAdapter
  );
}
