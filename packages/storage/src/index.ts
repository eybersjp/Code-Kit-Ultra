/**
 * Wave 9: Storage Provider Entrypoint.
 */

export * from "./provider.js";
export * from "./local-storage.js";
export * from "./insforge-storage.js";

import { StorageProvider } from "./provider.js";
import { LocalStorageProvider } from "./local-storage.js";
import { InsForgeStorage } from "./insforge-storage.js";
import path from "node:path";

export function getStorageProvider(options: { 
  type: 'local' | 'insforge' | 'combined', 
  localBaseDir: string,
  insforgeBucket?: string,
  insforgeApiKey?: string
}): StorageProvider {
  if (options.type === 'insforge') {
    if (!options.insforgeBucket || !options.insforgeApiKey) {
      console.warn("[StorageFactory] InsForge bucket or API key not provided. Falling back to local storage.");
      return new LocalStorageProvider(options.localBaseDir);
    }
    return new InsForgeStorage(options.insforgeBucket, options.insforgeApiKey);
  }

  // Combined provider that writes both for verification Wave 9
  if (options.type === 'combined') {
    const local = new LocalStorageProvider(options.localBaseDir);
    const insforge = options.insforgeBucket && options.insforgeApiKey 
      ? new InsForgeStorage(options.insforgeBucket, options.insforgeApiKey)
      : null;

    return {
      async put(key, data, opts) {
        const localMeta = await local.put(key, data, opts);
        if (insforge) {
           try {
             return await insforge.put(key, data, opts);
           } catch (err) {
             console.warn("[StorageFactory] InsForge write failed, returning local metadata as fallback.");
           }
        }
        return localMeta;
      },
      async get(key) {
        return local.get(key); // Fast local retrieval
      },
      async delete(key) {
        await local.delete(key);
        if (insforge) await insforge.delete(key).catch(() => {});
      },
      async getPublicUrl(key) {
        return local.getPublicUrl(key);
      }
    };
  }

  return new LocalStorageProvider(options.localBaseDir);
}
