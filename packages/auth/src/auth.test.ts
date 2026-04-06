import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveApiKeyUser } from "../../../packages/core/src/auth";

describe("Auth API key override", () => {
  beforeEach(() => {
    delete process.env.CODEKIT_ADMIN_API_KEY;
  });

  afterEach(() => {
    delete process.env.CODEKIT_ADMIN_API_KEY;
  });

  it("should resolve a known legacy API key", () => {
    const user = resolveApiKeyUser("admin-key");
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
    expect(user?.id).toBe("local-admin");
  });

  it("should resolve CODEKIT_ADMIN_API_KEY override as admin", () => {
    process.env.CODEKIT_ADMIN_API_KEY = "override-admin";
    const user = resolveApiKeyUser("override-admin");
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
    expect(user?.id).toBe("env-admin");
  });

  it("should reject unknown API keys", () => {
    const user = resolveApiKeyUser("unknown-key");
    expect(user).toBeNull();
  });
});
