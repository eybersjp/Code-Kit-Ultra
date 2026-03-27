import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProviderAdapter } from "../base/provider-adapter";

const execFileAsync = promisify(execFile);

interface TerminalPayload {
  command: string;
  args?: string[];
  cwd?: string;
  allowExecution?: boolean;
}

const SAFE_COMMANDS = new Set(["node", "npm", "python", "echo"]);

export class TerminalAdapter implements ProviderAdapter {
  id = "terminal";
  description = "Runs safe local commands or records dry-run output.";

  async validate(input: unknown): Promise<boolean> {
    const payload = input as Partial<TerminalPayload>;
    return typeof payload?.command === "string" && SAFE_COMMANDS.has(payload.command);
  }

  async execute(input: unknown) {
    const payload = input as TerminalPayload;
    if (!SAFE_COMMANDS.has(payload.command)) {
      return { success: false, error: `Unsafe command blocked: ${payload.command}` };
    }

    if (!payload.allowExecution) {
      return { success: true, output: `Dry run: ${payload.command} ${(payload.args ?? []).join(" ")}`.trim() };
    }

    const result = await execFileAsync(payload.command, payload.args ?? [], {
      cwd: payload.cwd,
      timeout: 15_000,
      windowsHide: true,
    });

    return { success: true, output: (result.stdout || result.stderr || "Command completed.").trim() };
  }
}
