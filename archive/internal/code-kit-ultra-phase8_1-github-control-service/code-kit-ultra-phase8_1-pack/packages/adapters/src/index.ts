import type { ProviderAdapter } from "./base/provider-adapter";
import { FileSystemAdapter } from "./providers/file-system-adapter";
import { TerminalAdapter } from "./providers/terminal-adapter";
import { GithubAdapter } from "./providers/github-adapter";
import { ApiAdapter } from "./providers/api-adapter";
import { AiAdapter } from "./providers/ai-adapter";

export function createProviderAdapters(): ProviderAdapter[] {
  return [
    new FileSystemAdapter(),
    new TerminalAdapter(),
    new GithubAdapter(),
    new ApiAdapter(),
    new AiAdapter(),
  ];
}

export function findAdapter(adapters: ProviderAdapter[], id: string): ProviderAdapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}
