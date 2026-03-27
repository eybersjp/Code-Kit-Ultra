import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { verifyInsForgeToken } from "./verify-insforge-token";

vi.mock("jsonwebtoken");
vi.mock("jwks-rsa");

describe("verifyInsForgeToken", () => {
  const mockEnv = {
    INSFORGE_JWT_ISSUER: "https://auth.insforge.com",
    INSFORGE_JWT_AUDIENCE: "cku-api",
    INSFORGE_JWKS_URL: "https://auth.insforge.com/.well-known/jwks.json",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INSFORGE_JWT_ISSUER = mockEnv.INSFORGE_JWT_ISSUER;
    process.env.INSFORGE_JWT_AUDIENCE = mockEnv.INSFORGE_JWT_AUDIENCE;
    process.env.INSFORGE_JWKS_URL = mockEnv.INSFORGE_JWKS_URL;
  });

  it("should accept a valid JWT", async () => {
    const mockToken = "valid-token";
    const mockDecoded = { sub: "user-123", roles: ["admin"] };

    // Mock jwks-rsa
    const mockGetSigningKey = vi.fn((kid, cb) => cb(null, { getPublicKey: () => "public-key" }));
    (jwksClient as any).mockReturnValue({ getSigningKey: mockGetSigningKey });

    // Mock jsonwebtoken verify
    (jwt.verify as any).mockImplementation((token, getKey, options, callback) => {
      callback(null, mockDecoded);
    });

    const result = await verifyInsForgeToken(mockToken);
    expect(result).toEqual(mockDecoded);
    expect(jwt.verify).toHaveBeenCalledWith(
      mockToken,
      expect.any(Function),
      expect.objectContaining({
        issuer: mockEnv.INSFORGE_JWT_ISSUER,
        audience: mockEnv.INSFORGE_JWT_AUDIENCE,
      }),
      expect.any(Function)
    );
  });

  it("should reject an invalid JWT", async () => {
    const mockToken = "invalid-token";

    // Mock jwks-rsa
    const mockGetSigningKey = vi.fn((kid, cb) => cb(null, { getPublicKey: () => "public-key" }));
    (jwksClient as any).mockReturnValue({ getSigningKey: mockGetSigningKey });

    // Mock jsonwebtoken verify failure
    (jwt.verify as any).mockImplementation((token, getKey, options, callback) => {
      callback(new Error("invalid signature"), null);
    });

    await expect(verifyInsForgeToken(mockToken)).rejects.toThrow("InsForge token verification failed: invalid signature");
  });

  it("should reject an expired JWT", async () => {
    const mockToken = "expired-token";

    // Mock jwks-rsa
    const mockGetSigningKey = vi.fn((kid, cb) => cb(null, { getPublicKey: () => "public-key" }));
    (jwksClient as any).mockReturnValue({ getSigningKey: mockGetSigningKey });

    // Mock jsonwebtoken verify expiry
    (jwt.verify as any).mockImplementation((token, getKey, options, callback) => {
      callback(new Error("jwt expired"), null);
    });

    await expect(verifyInsForgeToken(mockToken)).rejects.toThrow("InsForge token verification failed: jwt expired");
  });

  it("should throw if environment is not configured", async () => {
    delete process.env.INSFORGE_JWT_ISSUER;
    await expect(verifyInsForgeToken("some-token")).rejects.toThrow("InsForge authentication foundation is not configured");
  });
});
