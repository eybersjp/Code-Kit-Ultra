import fs from "node:fs";
import path from "node:path";

interface RuntimeHardening {
  timeouts: { defaultMs: number; planningMs: number; implementationMs: number };
  retries: { defaultMaxAttempts: number; backoffMs: number; retryableErrors: string[] };
  fallbacks: { preferStubWhenRealUnavailable: boolean };
}

export function loadExecutionPolicy(): RuntimeHardening {
  return JSON.parse(fs.readFileSync(path.resolve("config/runtime-hardening.json"), "utf-8")) as RuntimeHardening;
}