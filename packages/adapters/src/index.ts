export type {
  AdapterCapability,
  AdapterExecutionRequest,
  AdapterExecutionResult,
  AdapterRecommendation,
  PlatformAdapter,
} from "./types";

export type { ProviderAdapter } from "./base/provider-adapter";

import { antigravityAdapter } from "./antigravity-adapter";
import { cursorAdapter } from "./cursor-adapter";
import { windsurfAdapter } from "./windsurf-adapter";
import { openaiAdapter } from "./openai-adapter";
import { geminiAdapter } from "./gemini-adapter";
import { claudeAdapter } from "./claude-adapter";

export { antigravityAdapter, cursorAdapter, windsurfAdapter, openaiAdapter, geminiAdapter, claudeAdapter };

import { FileSystemAdapter } from "./providers/file-system-adapter";
import { TerminalAdapter } from "./providers/terminal-adapter";
import { GithubAdapter } from "./providers/github-adapter";
import type { ProviderAdapter } from "./base/provider-adapter";

export { FileSystemAdapter, TerminalAdapter, GithubAdapter };

export function createProviderAdapters(): ProviderAdapter[] {
  return [new FileSystemAdapter(), new TerminalAdapter(), new GithubAdapter()];
}

export function findAdapter(
  adapters: ProviderAdapter[],
  id: string
): ProviderAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

import type { AdapterExecutionRequest, AdapterRecommendation, PlatformAdapter } from "./types";

export function getAvailableAdapters(): PlatformAdapter[] {
  return [
    antigravityAdapter,
    cursorAdapter,
    windsurfAdapter,
    openaiAdapter,
    geminiAdapter,
    claudeAdapter,
  ];
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
