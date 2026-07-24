import jwt, { type SignOptions, type VerifyOptions } from "jsonwebtoken";
import {
  getJwtAlgorithm,
  getJwtKeyId,
  getJwtPrivateKey,
  getJwtPublicKey,
  getJwtSecret,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} from "../config/env.js";

export type JwtPayload = {
  sub: number | string;
  role: "USER" | "ADMIN";
  typ?: "refresh";
  jti?: string;
  fam?: string;
  tenantId?: number | string;
};

function getSigningKey(): string {
  return getJwtAlgorithm() === "RS256" ? getJwtPrivateKey() : getJwtSecret();
}

function getVerifyingKey(): string {
  return getJwtAlgorithm() === "RS256" ? getJwtPublicKey() : getJwtSecret();
}

function signOptions(expiresIn: string): SignOptions {
  const algorithm = getJwtAlgorithm();
  return {
    expiresIn,
    algorithm,
    ...(algorithm === "RS256" ? { keyid: getJwtKeyId() } : {}),
  } as SignOptions;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSigningKey(), signOptions(JWT_ACCESS_EXPIRES_IN));
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, typ: "refresh" }, getSigningKey(), signOptions(JWT_REFRESH_EXPIRES_IN));
}

export function verifyToken<T = JwtPayload>(token: string): T {
  return jwt.verify(token, getVerifyingKey(), { algorithms: [getJwtAlgorithm()] } as VerifyOptions) as T;
}
