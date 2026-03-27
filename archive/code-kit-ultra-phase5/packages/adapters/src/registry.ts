import type { PlatformAdapter } from "../../shared/src/contracts";
import { CursorRealAdapter } from "./cursor-real";
import { WindsurfRealAdapter } from "./windsurf-real";
import { AntigravityRealAdapter } from "./antigravity-real";
import { N8NRealAdapter } from "./n8n-real";
import { WindmillRealAdapter } from "./windmill-real";
import { CursorStubAdapter } from "./cursor-stub";
import { WindsurfStubAdapter } from "./windsurf-stub";
import { AntigravityStubAdapter } from "./antigravity-stub";
import { N8NStubAdapter } from "./n8n-stub";
import { WindmillStubAdapter } from "./windmill-stub";
import { FallbackStubAdapter } from "./fallback-stub";

export function getAdapterRegistry(): PlatformAdapter[] {
  return [
    new CursorRealAdapter(),
    new WindsurfRealAdapter(),
    new AntigravityRealAdapter(),
    new N8NRealAdapter(),
    new WindmillRealAdapter(),
    new CursorStubAdapter(),
    new WindsurfStubAdapter(),
    new AntigravityStubAdapter(),
    new N8NStubAdapter(),
    new WindmillStubAdapter(),
    new FallbackStubAdapter()
  ];
}