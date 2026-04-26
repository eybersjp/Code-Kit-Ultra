import { beforeAll, afterAll, beforeEach } from "vitest";

// Set required environment variables for tests
beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/cku_test";
  process.env.REDIS_URL =
    process.env.REDIS_URL || "redis://localhost:6379/1";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ||
    "test_secret_key_that_is_long_enough_for_testing_purposes_1234567890";
  process.env.NODE_ENV = process.env.NODE_ENV || "test";
  process.env.CKU_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:7473";
});

// Mock localStorage for browser tests running in node environment
if (typeof (global as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

// Optional: Set up global mocks if needed
beforeEach(() => {
  // Clear any previous mocks between tests
  if ((global as any).localStorage) {
    (global as any).localStorage.clear();
  }
});

afterAll(() => {
  // Cleanup after all tests
});
