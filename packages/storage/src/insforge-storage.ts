import { ArtifactMetadata, StorageProvider, StorageOptions } from "./provider.js";
import axios from "axios";

/**
 * InsForge Storage Provider.
 * This is the production-grade storage provider that stores artifacts in the cloud.
 */

export class InsForgeStorage implements StorageProvider {
  private endpoint: string;
  private bucket: string;
  private apiKey: string;

  constructor(bucket: string, apiKey: string) {
    this.bucket = bucket;
    this.apiKey = apiKey;
    this.endpoint = process.env.INSFORGE_STORAGE_ENDPOINT || "http://storage.insforge.internal";
  }

  async put(key: string, data: string | Buffer, options?: StorageOptions): Promise<ArtifactMetadata> {
    const formData = new FormData();
    const blob = new Blob([data as any], { type: options?.contentType || "application/octet-stream" });
    
    formData.append("file", blob, key);
    formData.append("key", key);
    formData.append("bucket", this.bucket);
    if (options?.isPublic) formData.append("isPublic", "true");

    try {
      const response = await axios.post(`${this.endpoint}/upload`, formData, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "multipart/form-data",
        }
      });

      const { size, url, hash } = response.data;

      return {
        key,
        fileName: key,
        contentType: options?.contentType || "application/octet-stream",
        size: size || (Buffer.isBuffer(data) ? data.length : data.length),
        storagePath: url,
        provider: "insforge",
        createdAt: new Date().toISOString(),
        hash,
        tags: options?.tags,
      };
    } catch (err: any) {
      console.warn(`[InsForgeStorage] Upload failed: ${err.message}. Local storage fallback might be needed.`);
      throw new Error(`InsForge upload failed: ${err.message}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const response = await axios.get(`${this.endpoint}/download/${this.bucket}/${key}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
      responseType: "arraybuffer",
    });
    return Buffer.from(response.data);
  }

  async delete(key: string): Promise<void> {
    await axios.delete(`${this.endpoint}/delete/${this.bucket}/${key}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });
  }

  async getPublicUrl(key: string): Promise<string> {
    return `${this.endpoint}/public/${this.bucket}/${key}`;
  }
}
