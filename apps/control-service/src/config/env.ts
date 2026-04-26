import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string()
    .url('DATABASE_URL must be a valid URL')
    .startsWith('postgresql://', 'DATABASE_URL must start with postgresql://'),
  REDIS_URL: z.string()
    .url('REDIS_URL must be a valid URL')
    .startsWith('redis://', 'REDIS_URL must start with redis://'),
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(7474),
  CKU_ALLOWED_ORIGINS: z.string().default('http://localhost:7473'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  INSFORGE_API_KEY: z.string().optional(),
  INSFORGE_PROJECT_ID: z.string().optional(),
  INSFORGE_API_BASE_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let configCache: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      console.error('Environment validation failed:\n' + messages);
      process.exit(1);
    }
    throw error;
  }
}

export function getConfig(): EnvConfig {
  if (!configCache) {
    // Skip validation in test mode - tests set required env vars via vitest.setup.ts
    if (process.env.NODE_ENV === 'test') {
      // Return a minimal config for tests
      configCache = {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/cku_test',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/1',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-at-least-32-characters-long-enough',
        NODE_ENV: 'test',
        PORT: 7474,
        CKU_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:7473',
        LOG_LEVEL: 'info',
      } as EnvConfig;
    } else {
      configCache = validateEnv();
    }
  }
  return configCache;
}
