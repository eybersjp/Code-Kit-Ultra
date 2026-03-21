import fs from "node:fs";
import path from "node:path";
export interface AdapterConfigItem { enabled: boolean; type: "real" | "stub"; requiredEnv: string[]; baseUrl?: string; }
export interface AdapterConfigFile { adapters: Record<string, AdapterConfigItem>; }
export function loadAdapterConfig(): AdapterConfigFile {
  return JSON.parse(fs.readFileSync(path.resolve("config/adapters.json"), "utf-8")) as AdapterConfigFile;
}