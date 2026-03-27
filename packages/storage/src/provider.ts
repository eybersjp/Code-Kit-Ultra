/**
 * Wave 9: Storage Provider Abstraction.
 * Normalized interface for artifact and log storage.
 */

export interface ArtifactMetadata {
  key: string;               // Unique storage key
  fileName: string;          // Original file name
  contentType: string;       // MIME type
  size: number;              // Size in bytes
  storagePath: string;       // Calculated storage path or URL
  provider: string;          // Provider ID (e.g., 'local', 'insforge')
  createdAt: string;         // ISO timestamp
  hash?: string;             // Content hash for integrity
  version?: string;          // Version ID if supported
  tags?: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Put an object into storage.
   */
  put(key: string, data: string | Buffer, options?: StorageOptions): Promise<ArtifactMetadata>;

  /**
   * Get an object from storage.
   */
  get(key: string): Promise<Buffer>;

  /**
   * Delete an object from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Get a signed URL or public URL for the artifact.
   */
  getPublicUrl(key: string): Promise<string>;
}

export interface StorageOptions {
  contentType?: string;
  isPublic?: boolean;
  tags?: Record<string, string>;
}
