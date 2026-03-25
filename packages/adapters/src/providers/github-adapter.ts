import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AdapterExecuteResult, AdapterSimulationPreview, AdapterVerificationResult, ExecutionRisk, ProviderAdapter } from "../base/provider-adapter";

const execFileAsync = promisify(execFile);

interface GitHubCommitPayload {
  action: "commit";
  repoPath: string;
  branch?: string;
  message?: string;
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
  message?: string;
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

interface GitHubValidateDiffPayload {
  action: "validate-diff";
  repoPath: string;
  maxChangedFiles?: number;
}

type GitHubPayload = GitHubCommitPayload | GitHubPushPayload | GitHubCreatePrPayload | GitHubCommitAndPrPayload | GitHubCreateCheckPayload | GitHubValidateDiffPayload;

async function runGit(repoPath: string, args: string[], extraEnv?: NodeJS.ProcessEnv): Promise<string> {
  const result = await execFileAsync("git", args, {
    cwd: repoPath,
    timeout: 30_000,
    windowsHide: true,
    env: { ...process.env, ...extraEnv },
  });
  return (result.stdout || result.stderr || "").trim();
}

function getToken(payload: { token?: string }): string | undefined {
  return payload.token || process.env.GITHUB_TOKEN;
}

async function generateCommitMessage(repoPath: string): Promise<string> {
  const names = await runGit(repoPath, ["diff", "--cached", "--name-only"]);
  const files = names.split(/\r?\n/).filter(Boolean);
  if (!files.length) return "chore: no staged changes";
  const lead = files.slice(0, 3).join(", ");
  return `feat: update ${lead}${files.length > 3 ? ` and ${files.length - 3} more file(s)` : ""}`;
}

async function validateDiff(repoPath: string, maxChangedFiles = 25): Promise<AdapterVerificationResult> {
  const names = await runGit(repoPath, ["diff", "--cached", "--name-only"]);
  const files = names.split(/\r?\n/).filter(Boolean);
  const ok = files.length <= maxChangedFiles;
  return {
    ok,
    summary: ok ? `Validated staged diff across ${files.length} file(s).` : `Diff too large: ${files.length} staged files exceeds ${maxChangedFiles}.`,
    details: { files },
  };
}

export class GithubAdapter implements ProviderAdapter {
  id = "github";
  description = "Executes local git commit/push workflows and can create real pull requests via the GitHub API.";

  async validate(input: unknown): Promise<boolean> {
    const payload = input as Partial<GitHubPayload>;
    if (!payload || typeof payload !== "object" || typeof payload.action !== "string") return false;

    switch (payload.action) {
      case "commit":
        return typeof payload.repoPath === "string";
      case "push":
        return typeof payload.repoPath === "string" && typeof payload.branch === "string";
      case "create-pr":
        return [payload.owner, payload.repo, payload.title, payload.head, payload.base].every((value) => typeof value === "string");
      case "commit-and-pr":
        return [payload.repoPath, payload.branch, payload.title, payload.base, payload.owner, payload.repo].every((value) => typeof value === "string");
      case "create-check":
        return [payload.owner, payload.repo, payload.head_sha, payload.name, payload.conclusion, payload.title, payload.summary].every((value) => typeof value === "string");
      case "validate-diff":
        return typeof payload.repoPath === "string";
      default:
        return false;
    }
  }

  async estimateRisk(input: unknown): Promise<ExecutionRisk> {
    const payload = input as GitHubPayload;
    if (payload.action === "validate-diff") return "low";
    if (payload.action === "commit") return "medium";
    return "high";
  }

  async simulate(input: unknown): Promise<AdapterSimulationPreview> {
    const payload = input as GitHubPayload;
    const risk = await this.estimateRisk(input);
    return {
      summary: `GitHub adapter will perform ${payload.action}`,
      risk,
      requiresApproval: risk !== "low",
      previewData: { action: payload.action },
    };
  }

  async execute(input: unknown): Promise<AdapterExecuteResult> {
    const payload = input as GitHubPayload;

    switch (payload.action) {
      case "validate-diff": {
        const result = await validateDiff(payload.repoPath, payload.maxChangedFiles);
        return { success: result.ok, output: result.summary, metadata: result.details };
      }
      case "commit": {
        const branch = payload.branch ?? "";
        if (branch) await runGit(payload.repoPath, ["checkout", "-B", branch]);

        if (payload.addAll !== false) await runGit(payload.repoPath, ["add", "-A"]);
        else if (payload.paths?.length) await runGit(payload.repoPath, ["add", ...payload.paths]);

        const status = await runGit(payload.repoPath, ["status", "--porcelain"]);
        if (!status.trim()) {
          return { success: true, output: "No changes to commit.", metadata: { skipped: true } };
        }

        const diffValidation = await validateDiff(payload.repoPath);
        if (!diffValidation.ok) {
          return { success: false, error: diffValidation.summary, metadata: diffValidation.details };
        }

        const env: NodeJS.ProcessEnv = {};
        if (payload.authorName) env.GIT_AUTHOR_NAME = payload.authorName;
        if (payload.authorEmail) env.GIT_AUTHOR_EMAIL = payload.authorEmail;
        if (payload.authorName) env.GIT_COMMITTER_NAME = payload.authorName;
        if (payload.authorEmail) env.GIT_COMMITTER_EMAIL = payload.authorEmail;

        const message = payload.message && payload.message.trim() ? payload.message : await generateCommitMessage(payload.repoPath);
        const commitOutput = await runGit(payload.repoPath, ["commit", "-m", message], env);
        const commitSha = await runGit(payload.repoPath, ["rev-parse", "HEAD"]);
        const currentBranch = await runGit(payload.repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);

        return {
          success: true,
          output: commitOutput,
          metadata: { commitSha, branch: currentBranch, message },
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
            "User-Agent": "code-kit-ultra-phase9.3",
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
            "User-Agent": "code-kit-ultra-phase9.3",
          },
          body: JSON.stringify({
            name: payload.name,
            head_sha: payload.head_sha,
            status: "completed",
            conclusion: payload.conclusion,
            output: { title: payload.title, summary: payload.summary },
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

        const prBody = [
          payload.body ?? "",
          "",
          "---",
          "Generated by Code Kit Ultra Phase 9.3",
          `Commit: ${(commitResult.metadata as Record<string, unknown> | undefined)?.commitSha ?? "unknown"}`,
        ].join("\n");

        const prResult = await this.execute({
          action: "create-pr",
          owner: payload.owner,
          repo: payload.repo,
          title: payload.title,
          head: payload.branch,
          base: payload.base,
          body: prBody,
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

  async verify(input: unknown, result: AdapterExecuteResult): Promise<AdapterVerificationResult> {
    const payload = input as GitHubPayload;
    if (!result.success) return { ok: false, summary: result.error ?? "GitHub action failed." };
    if (payload.action === "commit" && payload.repoPath) {
      return validateDiff(payload.repoPath);
    }
    return { ok: true, summary: `GitHub action ${payload.action} completed.` };
  }

  async suggestFix(error: unknown, input: unknown): Promise<string> {
    const payload = input as Partial<GitHubPayload>;
    return `Check git repo state, remote configuration, and GITHUB_TOKEN for action ${payload.action ?? "unknown"}. Error: ${error instanceof Error ? error.message : String(error)}`;
  }

  async rollback(input: unknown): Promise<void> {
    const payload = input as Partial<GitHubCommitPayload & { hard?: boolean }>;
    if (!payload.repoPath) return;
    if (payload.hard) await runGit(payload.repoPath, ["reset", "--hard", "HEAD~1"]);
    else await runGit(payload.repoPath, ["reset", "--soft", "HEAD~1"]);
  }
}
