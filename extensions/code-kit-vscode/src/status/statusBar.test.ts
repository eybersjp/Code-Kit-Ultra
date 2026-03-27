import { describe, it, expect, vi, beforeEach } from "vitest";
import { CKStatusBar } from "./statusBar";
import { SessionManager } from "../auth/sessionClient";

const mockStatusBarItem = {
  text: "",
  tooltip: "",
  command: "",
  backgroundColor: undefined,
  show: vi.fn(),
};

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    createStatusBarItem: vi.fn(() => mockStatusBarItem)
  },
  StatusBarAlignment: { Left: 1 },
  ThemeColor: class { constructor(public id: string) {} },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key) => {
        if (key === "authMode") return "bearer-session";
        return null;
      })
    }))
  }
}));

vi.mock("../auth/sessionClient", () => ({
  SessionManager: {
    getInstance: vi.fn(() => ({
      token: "some-token",
      session: { actor: { actorId: "u1" }, tenant: { orgId: "o1" } }
    }))
  }
}));

describe("CKStatusBar", () => {
  let statusBar: CKStatusBar;

  beforeEach(() => {
    vi.clearAllMocks();
    statusBar = (CKStatusBar as any).init({ subscriptions: [] });
  });

  it("should show offline state", async () => {
    await statusBar.update(false);
    expect(mockStatusBarItem.text).toContain("Offline");
    expect((mockStatusBarItem.backgroundColor as any).id).toBe("statusBarItem.errorBackground");
  });

  it("should show online state when authenticated", async () => {
    await statusBar.update(true);
    expect(mockStatusBarItem.text).toContain("Online");
    expect(mockStatusBarItem.backgroundColor).toBeUndefined();
  });

  it("should show signed out state", async () => {
    (SessionManager.getInstance as any).mockReturnValue({ token: null, session: null });
    await statusBar.update(true);
    expect(mockStatusBarItem.text).toContain("Signed Out");
  });

  it("should show expired state", async () => {
    (SessionManager.getInstance as any).mockReturnValue({ token: "expired", session: null });
    await statusBar.update(true);
    expect(mockStatusBarItem.text).toContain("Auth Expired");
  });
  it("should show deprecated warning for legacy auth mode", async () => {
    const vscode = await import("vscode");
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key) => {
        if (key === "authMode") return "legacy-api-key";
        return null;
      })
    });

    await statusBar.update(true);
    expect(mockStatusBarItem.text).toContain("Legacy");
    expect((mockStatusBarItem.backgroundColor as any).id).toBe("statusBarItem.warningBackground");
  });
});
