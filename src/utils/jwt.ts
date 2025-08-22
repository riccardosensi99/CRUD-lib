import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, JWT_SECRET } from "../config/env.js";

export type JwtPayload = {
  sub: number;
  role: "USER" | "ADMIN";
  typ?: "refresh";
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, typ: "refresh" }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken<T = JwtPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
