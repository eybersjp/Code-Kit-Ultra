import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ArtifactMetadata, StorageProvider, StorageOptions } from "./provider.js";

/**
 * Local file-system based storage provider.
 * This is the canonical default for developer-first local usage.
 */

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  async put(key: string, data: string | Buffer, options?: StorageOptions): Promise<ArtifactMetadata> {
    const fullPath = path.join(this.baseDir, key);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });

    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.writeFile(fullPath, content);

    const stats = await fs.stat(fullPath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    return {
      key,
      fileName: path.basename(key),
      contentType: options?.contentType || "application/octet-stream",
      size: stats.size,
      storagePath: `file://${fullPath}`, // Local URL scheme
      provider: "local",
      createdAt: new Date().toISOString(),
      hash,
      tags: options?.tags,
    };
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.unlink(fullPath);
  }

  async getPublicUrl(key: string): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    return `file://${fullPath}`;
  }
}
