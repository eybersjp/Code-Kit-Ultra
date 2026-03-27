import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProviderAdapter } from "../base/provider-adapter";

const execFileAsync = promisify(execFile);

interface GitHubCommitPayload {
  action: "commit";
  repoPath: string;
  branch?: string;
  message: string;
  addAll?: boolean;
  paths?: string[];
  authorName?: string;
  authorEmail?: string;
}

interface GitHubPushPayload {
  action: "push";
  repoPath: string;
  branch: string;
  remote?: string;
}

interface GitHubCreatePrPayload {
  action: "create-pr";
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
  token?: string;
  apiBaseUrl?: string;
}

interface GitHubCommitAndPrPayload {
  action: "commit-and-pr";
  repoPath: string;
  branch: string;
  message: string;
  title: string;
  body?: string;
  base: string;
  owner: string;
  repo: string;
  token?: string;
  apiBaseUrl?: string;
  remote?: string;
  addAll?: boolean;
  paths?: string[];
  authorName?: string;
  authorEmail?: string;
}

interface GitHubCreateCheckPayload {
  action: "create-check";
  owner: string;
  repo: string;
  head_sha: string;
  name: string;
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required";
  title: string;
  summary: string;
  token?: string;
  apiBaseUrl?: string;
}

type GitHubPayload = GitHubCommitPayload | GitHubPushPayload | GitHubCreatePrPayload | GitHubCommitAndPrPayload | GitHubCreateCheckPayload;

async function runGit(repoPath: string, args: string[], extraEnv?: NodeJS.ProcessEnv): Promise<string> {
  const result = await execFileAsync("git", args, {
    cwd: repoPath,
    timeout: 30_000,
    windowsHide: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  return (result.stdout || result.stderr || "").trim();
}

function getToken(payload: { token?: string }): string | undefined {
  return payload.token || process.env.GITHUB_TOKEN;
}

export class GithubAdapter implements ProviderAdapter {
  id = "github";
  description = "Executes local git commit/push workflows and can create real pull requests via the GitHub API.";

  async validate(input: unknown): Promise<boolean> {
    const payload = input as Partial<GitHubPayload>;
    if (!payload || typeof payload !== "object" || typeof payload.action !== "string") return false;

    switch (payload.action) {
      case "commit":
        return typeof payload.repoPath === "string" && typeof payload.message === "string";
      case "push":
        return typeof payload.repoPath === "string" && typeof payload.branch === "string";
      case "create-pr":
        return [payload.owner, payload.repo, payload.title, payload.head, payload.base].every((value) => typeof value === "string");
      case "commit-and-pr":
        return [payload.repoPath, payload.branch, payload.message, payload.title, payload.base, payload.owner, payload.repo].every(
          (value) => typeof value === "string",
        );
      case "create-check":
        return [payload.owner, payload.repo, payload.head_sha, payload.name, payload.conclusion, payload.title, payload.summary].every(
          (value) => typeof value === "string",
        );
      default:
        return false;
    }
  }

  async execute(input: unknown): Promise<import("../base/provider-adapter").AdapterExecuteResult> {
    const payload = input as GitHubPayload;

    switch (payload.action) {
      case "commit": {
        const branch = payload.branch ?? "";
        if (branch) {
          await runGit(payload.repoPath, ["checkout", "-B", branch]);
        }

        if (payload.addAll !== false) {
          await runGit(payload.repoPath, ["add", "-A"]);
        } else if (payload.paths?.length) {
          await runGit(payload.repoPath, ["add", ...payload.paths]);
        }

        const status = await runGit(payload.repoPath, ["status", "--porcelain"]);
        if (!status.trim()) {
          return {
            success: true,
            output: "No changes to commit.",
            metadata: { skipped: true },
          };
        }

        const env: NodeJS.ProcessEnv = {};
        if (payload.authorName) env.GIT_AUTHOR_NAME = payload.authorName;
        if (payload.authorEmail) env.GIT_AUTHOR_EMAIL = payload.authorEmail;
        if (payload.authorName) env.GIT_COMMITTER_NAME = payload.authorName;
        if (payload.authorEmail) env.GIT_COMMITTER_EMAIL = payload.authorEmail;

        const commitOutput = await runGit(payload.repoPath, ["commit", "-m", payload.message], env);
        const commitSha = await runGit(payload.repoPath, ["rev-parse", "HEAD"]);
        const currentBranch = await runGit(payload.repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);

        return {
          success: true,
          output: commitOutput,
          metadata: { commitSha, branch: currentBranch },
        };
      }
      case "push": {
        const remote = payload.remote ?? "origin";
        const output = await runGit(payload.repoPath, ["push", "-u", remote, payload.branch]);
        return { success: true, output, metadata: { branch: payload.branch, remote } };
      }
      case "create-pr": {
        const token = getToken(payload);
        if (!token) {
          return { success: false, error: "Missing GitHub token. Set GITHUB_TOKEN or pass token in payload." };
        }

        const apiBaseUrl = payload.apiBaseUrl ?? "https://api.github.com";
        const response = await fetch(`${apiBaseUrl}/repos/${payload.owner}/${payload.repo}/pulls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "code-kit-ultra-phase8.1",
          },
          body: JSON.stringify({
            title: payload.title,
            head: payload.head,
            base: payload.base,
            body: payload.body ?? "",
            draft: payload.draft ?? false,
          }),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `GitHub PR creation failed: ${response.status} ${await response.text()}`,
          };
        }

        const data = (await response.json()) as { html_url?: string; number?: number };
        return {
          success: true,
          output: `Pull request created: ${data.html_url ?? `#${data.number ?? "unknown"}`}`,
          metadata: data as Record<string, unknown>,
        };
      }
      case "create-check": {
        const token = getToken(payload);
        if (!token) {
          return { success: false, error: "Missing GitHub token. Set GITHUB_TOKEN or pass token in payload." };
        }

        const apiBaseUrl = payload.apiBaseUrl ?? "https://api.github.com";
        const response = await fetch(`${apiBaseUrl}/repos/${payload.owner}/${payload.repo}/check-runs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "code-kit-ultra-phase9",
          },
          body: JSON.stringify({
            name: payload.name,
            head_sha: payload.head_sha,
            status: "completed",
            conclusion: payload.conclusion,
            output: {
              title: payload.title,
              summary: payload.summary,
            },
          }),
        });

        if (!response.ok) {
          return {
            success: false,
            error: `GitHub check creation failed: ${response.status} ${await response.text()}`,
          };
        }

        const data = (await response.json()) as { html_url?: string; id?: number };
        return {
          success: true,
          output: `Check run created: ${data.html_url ?? `#${data.id ?? "unknown"}`}`,
          metadata: data as Record<string, unknown>,
        };
      }
      case "commit-and-pr": {
        const commitResult = await this.execute({
          action: "commit",
          repoPath: payload.repoPath,
          branch: payload.branch,
          message: payload.message,
          addAll: payload.addAll,
          paths: payload.paths,
          authorName: payload.authorName,
          authorEmail: payload.authorEmail,
        } satisfies GitHubCommitPayload);
        if (!commitResult.success) return commitResult;

        const pushResult = await this.execute({
          action: "push",
          repoPath: payload.repoPath,
          branch: payload.branch,
          remote: payload.remote,
        } satisfies GitHubPushPayload);
        if (!pushResult.success) return pushResult;

        const prResult = await this.execute({
          action: "create-pr",
          owner: payload.owner,
          repo: payload.repo,
          title: payload.title,
          head: payload.branch,
          base: payload.base,
          body: payload.body,
          token: payload.token,
          apiBaseUrl: payload.apiBaseUrl,
        } satisfies GitHubCreatePrPayload);
        if (!prResult.success) return prResult;

        return {
          success: true,
          output: `${commitResult.output}\n${pushResult.output}\n${prResult.output}`,
          metadata: {
            commit: commitResult.metadata,
            push: pushResult.metadata,
            pullRequest: prResult.metadata,
          },
        };
      }
      default:
        return { success: false, error: `Unsupported GitHub action: ${(payload as GitHubPayload).action}` };
    }
  }

  async rollback(input: unknown): Promise<void> {
    const payload = input as Partial<GitHubCommitPayload & { hard?: boolean }>;
    if (!payload.repoPath) return;
    if (payload.hard) {
      await runGit(payload.repoPath, ["reset", "--hard", "HEAD~1"]);
    } else {
      await runGit(payload.repoPath, ["reset", "--soft", "HEAD~1"]);
    }
  }
}
