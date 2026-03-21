import { z } from "zod";

export const EnvSchema = z.object({
  ANTIGRAVITY_API_KEY: z.string().optional(),
  ANTIGRAVITY_BASE_URL: z.string().url().optional(),
  CURSOR_API_KEY: z.string().optional(),
  CURSOR_BASE_URL: z.string().url().optional(),
  WINDSURF_API_KEY: z.string().optional(),
  WINDSURF_BASE_URL: z.string().url().optional(),
  CODEKIT_PROFILE: z.string().optional(),
  CODEKIT_TIMEOUT_MS: z.string().optional(),
  CODEKIT_MAX_RETRIES: z.string().optional()
});

export function validateEnv(env: Record<string, string | undefined>) {
  return EnvSchema.safeParse(env);
}