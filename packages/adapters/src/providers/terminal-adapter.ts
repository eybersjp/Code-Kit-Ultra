import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AdapterExecuteResult, AdapterSimulationPreview, AdapterVerificationResult, ExecutionRisk, ProviderAdapter } from "../base/provider-adapter";

const execFileAsync = promisify(execFile);

interface TerminalPayload {
  command: string;
  args?: string[];
  cwd?: string;
  allowExecution?: boolean;
}

const SAFE_COMMANDS = new Set(["node", "npm", "python", "echo", "git", "ls", "dir", "mkdir"]);

export class TerminalAdapter implements ProviderAdapter {
  id = "terminal";
  description = "Runs safe local commands or records dry-run output.";

  async validate(input: unknown): Promise<boolean> {
    const payload = input as Partial<TerminalPayload>;
    return typeof payload?.command === "string";
  }

  async estimateRisk(input: unknown): Promise<ExecutionRisk> {
    const payload = input as Partial<TerminalPayload>;
    if (!payload.allowExecution || !payload.command) return "low";
    return ["echo", "node", "npm"].includes(payload.command) ? "low" : "medium";
  }

  async simulate(input: unknown): Promise<AdapterSimulationPreview> {
    const payload = input as TerminalPayload;
    const risk = await this.estimateRisk(input);
    return {
      summary: `${payload.allowExecution ? 'Execute' : 'Dry-run'} terminal command: ${payload.command} ${(payload.args ?? []).join(' ')}`.trim(),
      risk,
      requiresApproval: risk !== 'low' && Boolean(payload.allowExecution),
      previewData: { command: payload.command, args: payload.args ?? [], cwd: payload.cwd ?? process.cwd() },
    };
  }

  async execute(input: unknown): Promise<AdapterExecuteResult> {
    const payload = input as TerminalPayload;
    if (!SAFE_COMMANDS.has(payload.command)) {
      return { success: false, error: `Unsafe command blocked: ${payload.command}` };
    }

    if (!payload.allowExecution) {
      return { success: true, output: `Dry run: ${payload.command} ${(payload.args ?? []).join(" ")}`.trim(), metadata: { dryRun: true } };
    }

    try {
      const result = await execFileAsync(payload.command, payload.args ?? [], {
        cwd: payload.cwd || process.cwd(),
        timeout: 15_000,
        windowsHide: true,
      });

      return { success: true, output: (result.stdout || result.stderr || "Command completed.").trim() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async verify(input: unknown, result: AdapterExecuteResult): Promise<AdapterVerificationResult> {
    const payload = input as TerminalPayload;
    return {
      ok: result.success,
      summary: result.success ? `Terminal step completed for ${payload.command}` : `Terminal step failed for ${payload.command}` ,
    };
  }

  async suggestFix(error: unknown, input: unknown): Promise<string> {
    const payload = input as Partial<TerminalPayload>;
    return `Confirm ${payload.command ?? 'command'} is in the safe allowlist and set allowExecution=true only when ready. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
