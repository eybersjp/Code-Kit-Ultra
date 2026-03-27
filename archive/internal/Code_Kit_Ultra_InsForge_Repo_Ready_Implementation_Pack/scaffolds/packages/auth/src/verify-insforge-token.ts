export interface VerifyInsForgeTokenInput {
  token: string;
  jwksUrl: string;
  issuer?: string;
  audience?: string;
}

export interface VerifiedInsForgeToken {
  sub: string;
  email?: string;
  exp: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  rawClaims: Record<string, unknown>;
}

export async function verifyInsForgeToken(
  input: VerifyInsForgeTokenInput,
): Promise<VerifiedInsForgeToken> {
  // TODO:
  // 1. Fetch/cache JWKS
  // 2. Verify JWT signature
  // 3. Validate exp / iss / aud
  // 4. Map claims to VerifiedInsForgeToken
  throw new Error("Not implemented");
}
