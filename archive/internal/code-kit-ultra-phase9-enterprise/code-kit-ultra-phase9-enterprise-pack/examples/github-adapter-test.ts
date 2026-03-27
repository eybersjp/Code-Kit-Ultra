import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GithubAdapter } from "../packages/adapters/src/providers/github-adapter";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]) {
  await execFileAsync("git", args, { cwd, windowsHide: true });
}

async function main(): Promise<void> {
  const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "cku-gh-"));
  await git(repoPath, ["init"]);
  await git(repoPath, ["config", "user.name", "Code Kit"]);
  await git(repoPath, ["config", "user.email", "codekit@example.com"]);

  await fs.writeFile(path.join(repoPath, "README.md"), "# Test Repo\n", "utf-8");
  await git(repoPath, ["add", "."]);
  await git(repoPath, ["commit", "-m", "initial commit"]);

  await fs.writeFile(path.join(repoPath, "feature.txt"), "feature work\n", "utf-8");

  const adapter = new GithubAdapter();
  const commitResult = await adapter.execute({
    action: "commit",
    repoPath,
    branch: "feature/phase8-1",
    message: "feat: add feature file",
    addAll: true,
  });

  if (!commitResult.success) {
    throw new Error(`Commit action failed: ${commitResult.error}`);
  }

  const branchName = (await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoPath })).stdout.trim();
  if (branchName !== "feature/phase8-1") {
    throw new Error(`Expected branch feature/phase8-1, got ${branchName}`);
  }

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/repos/demo/repo/pulls") {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ html_url: "https://example.test/demo/repo/pull/1", number: 1 }));
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind local PR test server.");
  }

  const prResult = await adapter.execute({
    action: "create-pr",
    owner: "demo",
    repo: "repo",
    title: "Phase 8.1 test PR",
    head: "feature/phase8-1",
    base: "main",
    body: "Test pull request",
    token: "local-test-token",
    apiBaseUrl: `http://127.0.0.1:${address.port}`,
  });

  server.close();

  if (!prResult.success) {
    throw new Error(`PR action failed: ${prResult.error}`);
  }

  console.log("GitHub adapter test OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
