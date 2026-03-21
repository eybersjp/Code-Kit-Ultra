import { validateEnv } from "../../shared/src/env-schema";

export function runStartupValidation() {
  const result = validateEnv(process.env);
  return {
    ok: result.success,
    issues: result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
  };
}