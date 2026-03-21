import type { PlatformAdapter } from "../../shared/src/contracts";
import { BaseAdapter } from "./base";

class CursorStubAdapter extends BaseAdapter {
  constructor() {
    super("cursor-stub", ["planning", "coding", "reporting"], "Cursor-style plan-first IDE stub");
  }
}

class WindsurfStubAdapter extends BaseAdapter {
  constructor() {
    super("windsurf-stub", ["coding", "reporting"], "Windsurf-style autonomous editor stub");
  }
}

class AntigravityStubAdapter extends BaseAdapter {
  constructor() {
    super("antigravity-stub", ["planning", "skills"], "Antigravity-style skill orchestration stub");
  }
}

class N8nStubAdapter extends BaseAdapter {
  constructor() {
    super("n8n-stub", ["automation"], "n8n workflow automation stub");
  }
}

class WindmillStubAdapter extends BaseAdapter {
  constructor() {
    super("windmill-stub", ["automation", "reporting"], "Windmill script/job execution stub");
  }
}

class FallbackStubAdapter extends BaseAdapter {
  constructor() {
    super("fallback-stub", ["planning", "coding", "skills", "automation", "reporting"], "Fallback adapter stub");
  }
}

export const stubAdapters: PlatformAdapter[] = [
  new CursorStubAdapter(),
  new WindsurfStubAdapter(),
  new AntigravityStubAdapter(),
  new N8nStubAdapter(),
  new WindmillStubAdapter(),
  new FallbackStubAdapter()
];
