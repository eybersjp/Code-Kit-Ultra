import { describe, it, expect, vi, beforeEach } from "vitest";

const execFileMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.stubGlobal("fetch", fetchMock);

describe("GithubAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  it("should simulate approval-required GitHub actions", async () => {
    const { GithubAdapter } = await import("./github-adapter");
    const adapter = new GithubAdapter();

    const preview = await adapter.simulate({ action: "commit", repoPath: "." });
    expect(preview.requiresApproval).toBe(true);
    expect(preview.summary).toContain("commit");
  });

  it("should fail create-pr when no token is supplied", async () => {
    const { GithubAdapter } = await import("./github-adapter");
    const adapter = new GithubAdapter();

    const result = await adapter.execute({
      action: "create-pr",
      owner: "example",
      repo: "repo",
      title: "Test PR",
      head: "feature-branch",
      base: "main",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing GitHub token");
  });

  it("should validate staged diff with zero changed files", async () => {
    execFileMock.mockImplementation((cmd, args, options, callback) => {
      callback(null, { stdout: "", stderr: "" });
    });

    const { GithubAdapter } = await import("./github-adapter");
    const adapter = new GithubAdapter();

    const result = await adapter.execute({ action: "validate-diff", repoPath: "." });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Validated staged diff");
    expect(result.metadata).toEqual({ files: [] });
  });

  it("should return success for commit when no changes are present", async () => {
    execFileMock.mockImplementation((cmd, args, options, callback) => {
      if (args.includes("status")) {
        callback(null, { stdout: "", stderr: "" });
      } else {
        callback(null, { stdout: "", stderr: "" });
      }
    });

    const { GithubAdapter } = await import("./github-adapter");
    const adapter = new GithubAdapter();

    const result = await adapter.execute({ action: "commit", repoPath: ".", addAll: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain("No changes to commit");
    expect(result.metadata).toMatchObject({ skipped: true });
  });
});
