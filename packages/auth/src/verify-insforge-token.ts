import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/**
 * Validates a JWT from InsForge using JWKS signature, issuer, audience, and expiry.
 */
export async function verifyInsForgeToken(token: string): Promise<Record<string, unknown>> {
  const issuer = process.env.INSFORGE_JWT_ISSUER;
  const audience = process.env.INSFORGE_JWT_AUDIENCE;
  const jwksUri = process.env.INSFORGE_JWKS_URL;

  if (!issuer || !audience || !jwksUri) {
    throw new Error("InsForge authentication foundation is not configured in environment (issuer, audience, or jwksUrl).");
  }

  const client = jwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  const getKey: jwt.GetPublicKeyOrSecret = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key!.getPublicKey();
      callback(null, signingKey);
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer,
        audience,
        algorithms: ["RS256"],
      },
      (err: Error | null, decoded: string | jwt.JwtPayload | undefined) => {
        if (err) {
          return reject(new Error(`InsForge token verification failed: ${err.message}`));
        }
        if (!decoded || typeof decoded === "string") {
          return reject(new Error("InsForge token decoded content is invalid."));
        }
        resolve(decoded as Record<string, unknown>);
      }
    );
  });
}
