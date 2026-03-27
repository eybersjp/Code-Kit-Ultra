import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionManager } from "./sessionClient";
import axios from "axios";

const mockConfig = {
  get: vi.fn<(key: string) => string | null>((key: string) => {
    if (key === "authMode") return "bearer-session";
    if (key === "controlServiceUrl") return "http://localhost:4000";
    return null;
  })
};

// Mock vscode
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => mockConfig)
  },
  secrets: {
    get: vi.fn(),
    store: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("axios");

describe("VS Code SessionManager", () => {
  let context: any;
  let manager: SessionManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    context = {
      secrets: {
        get: vi.fn().mockResolvedValue(null),
        store: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(null)
      }
    };
    manager = await SessionManager.init(context);
  });

  it("should initialize with no token", async () => {
    expect(manager.token).toBeNull();
    expect(manager.isActive).toBe(false);
  });

  it("should set token and refresh session", async () => {
    const mockSession = { actor: { actorId: "u1" }, expiresAt: Date.now() + 10000 };
    (axios.get as any).mockResolvedValue({ data: mockSession });

    await manager.setToken("new-token");

    expect(manager.token).toBe("new-token");
    expect(context.secrets.store).toHaveBeenCalledWith("cku.sessionToken", "new-token");
    expect(axios.get).toHaveBeenCalled();
    expect(manager.session).toEqual(mockSession);
    expect(manager.isActive).toBe(true);
  });

  it("should handle sign out", async () => {
    await manager.signOut();
    expect(manager.token).toBeNull();
    expect(manager.session).toBeNull();
    expect(context.secrets.delete).toHaveBeenCalledWith("cku.sessionToken");
  });

  it("should respect legacy auth mode", async () => {
    mockConfig.get.mockImplementation((key: string) => {
        if (key === "authMode") return "legacy-api-key";
        return null;
    });

    expect(manager.isActive).toBe(true);
  });
});
