import dotenv from "dotenv";
import { env } from "process";

dotenv.config();

export const {
  JWT_ACCESS_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN || "7d",
} = process.env;
export const JWT_SECRET = process.env.JWT_SECRET as string;

