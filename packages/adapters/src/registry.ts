import type { PlatformAdapter } from "../../shared/src/contracts";
import { AntigravityRealAdapter } from "./antigravity-real";
import { AntigravityStubAdapter } from "./antigravity-stub";
import { CursorStubAdapter } from "./cursor-stub";
import { WindsurfStubAdapter } from "./windsurf-stub";
import { N8nStubAdapter } from "./n8n-stub";
import { WindmillStubAdapter } from "./windmill-stub";
import { FallbackStubAdapter } from "./fallback-stub";

export function getAdapterRegistry(): PlatformAdapter[] {
  return [
    new AntigravityRealAdapter(),
    new AntigravityStubAdapter(),
    new CursorStubAdapter(),
    new WindsurfStubAdapter(),
    new N8nStubAdapter(),
    new WindmillStubAdapter(),
    new FallbackStubAdapter()
  ];
}