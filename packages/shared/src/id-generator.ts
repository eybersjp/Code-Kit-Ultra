import crypto from 'crypto';

/**
 * Generate a cryptographically secure audit event ID.
 * Format: audit-{timestamp}-{random-uuid}
 */
export const generateAuditId = (): string => {
  return `audit-${Date.now()}-${crypto.randomUUID()}`;
};

/**
 * Generate a cryptographically secure batch queue ID.
 * Format: batch_{random-hex}
 */
export const generateBatchId = (): string => {
  return `batch_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Generate a cryptographically secure service account ID.
 * Format: sa_{random-hex}
 */
export const generateServiceAccountId = (): string => {
  return `sa_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Verify ID is unique by checking for collisions.
 * Useful for testing ID generation security.
 */
export const verifyIdUniqueness = (generator: () => string, iterations: number = 1000): boolean => {
  const ids = new Set<string>();
  for (let i = 0; i < iterations; i++) {
    const id = generator();
    if (ids.has(id)) {
      return false; // Collision detected
    }
    ids.add(id);
  }
  return true; // All IDs unique
};
