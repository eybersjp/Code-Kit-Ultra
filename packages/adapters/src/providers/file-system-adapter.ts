import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecuteResult, AdapterSimulationPreview, AdapterVerificationResult, ExecutionRisk, ProviderAdapter } from "../base/provider-adapter";

interface FileSystemPayload {
  path: string;
  content: string;
}

export class FileSystemAdapter implements ProviderAdapter {
  id = "fs";
  description = "Writes generated artifacts to the local file system.";

  async validate(input: unknown): Promise<boolean> {
    const payload = input as Partial<FileSystemPayload>;
    return typeof payload?.path === "string" && typeof payload?.content === "string";
  }

  async estimateRisk(input: unknown): Promise<ExecutionRisk> {
    const payload = input as Partial<FileSystemPayload>;
    const protectedPaths = [".codekit", "package.json", "node_modules", ".env"];
    const isProtected = protectedPaths.some(p => payload?.path?.includes(p));
    return isProtected ? "high" : "low";
  }

  async simulate(input: unknown): Promise<AdapterSimulationPreview> {
    const payload = input as FileSystemPayload;
    const risk = await this.estimateRisk(input);
    return {
      summary: risk === "high" 
        ? `CRITICAL: Writing to system-critical path: ${payload.path}`
        : `Will write ${payload.content.length} bytes to ${payload.path}`,
      risk,
      requiresApproval: risk === "high",
      previewData: { path: payload.path, bytes: payload.content.length },
    };
  }

  async execute(input: unknown): Promise<AdapterExecuteResult> {
    const payload = input as FileSystemPayload;
    try {
      await fs.mkdir(path.dirname(payload.path), { recursive: true });
      await fs.writeFile(payload.path, payload.content, "utf-8");
      return { 
        success: true, 
        output: `File written to ${payload.path}`, 
        metadata: { path: payload.path, bytes: payload.content.length } 
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async verify(input: unknown, _result: AdapterExecuteResult): Promise<AdapterVerificationResult> {
    const payload = input as FileSystemPayload;
    try {
      const stat = await fs.stat(payload.path);
      return { 
        ok: stat.isFile(), 
        summary: stat.isFile() ? `Verified file exists at ${payload.path}` : `Expected file missing at ${payload.path}` 
      };
    } catch {
      return { ok: false, summary: `Expected file missing at ${payload.path}` };
    }
  }

  async suggestFix(error: unknown, input: unknown): Promise<string> {
    const payload = input as Partial<FileSystemPayload>;
    return `Check path permissions and parent directories for ${payload.path ?? 'unknown path'}: ${error instanceof Error ? error.message : String(error)}`;
  }

  async rollback(input: unknown): Promise<void> {
    const payload = input as Partial<FileSystemPayload>;
    if (payload.path) {
      await fs.rm(payload.path, { force: true });
    }
  }
}
