import fs from "node:fs/promises";
import path from "node:path";
import type { ProviderAdapter } from "../base/provider-adapter";

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

  async execute(input: unknown) {
    const payload = input as FileSystemPayload;
    await fs.mkdir(path.dirname(payload.path), { recursive: true });
    await fs.writeFile(payload.path, payload.content, "utf-8");
    return { success: true, output: `File written to ${payload.path}` };
  }

  async rollback(input: unknown): Promise<void> {
    const payload = input as Partial<FileSystemPayload>;
    if (payload.path) {
      await fs.rm(payload.path, { force: true });
    }
  }
}
