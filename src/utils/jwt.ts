import jwt, { type SignOptions } from "jsonwebtoken";
import { getJwtSecret, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from "../config/env.js";

export type JwtPayload = {
  sub: number;
  role: "USER" | "ADMIN";
  typ?: "refresh";
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, typ: "refresh" }, getJwtSecret(), {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken<T = JwtPayload>(token: string): T {
  return jwt.verify(token, getJwtSecret()) as T;
}
