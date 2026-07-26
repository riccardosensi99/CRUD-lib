import dotenv from "dotenv";

dotenv.config();

export const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is required before signing or verifying tokens");
  }
  return secret;
}

export type JwtAlgorithm = "HS256" | "RS256";

/** `HS256` (default, shared secret) or `RS256` (asymmetric, for JWKS-based verification across services). */
export function getJwtAlgorithm(): JwtAlgorithm {
  return (process.env.JWT_ALG || "HS256").trim().toUpperCase() === "RS256" ? "RS256" : "HS256";
}

function normalizePemEnv(value: string): string {
  // Supports keys stored with literal "\n" (common in .env files / CI secrets).
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

export function getJwtPrivateKey(): string {
  const key = process.env.JWT_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error("JWT_PRIVATE_KEY is required when JWT_ALG=RS256");
  }
  return normalizePemEnv(key);
}

export function getJwtPublicKey(): string {
  const key = process.env.JWT_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error("JWT_PUBLIC_KEY is required when JWT_ALG=RS256");
  }
  return normalizePemEnv(key);
}

/** Key id (`kid`) advertised in JWKS and stamped on RS256 tokens, so multiple keys can rotate side by side. */
export function getJwtKeyId(): string {
  return process.env.JWT_KEY_ID?.trim() || "default";
}
