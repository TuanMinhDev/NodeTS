import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Request } from "express";

export const ACCESS_TOKEN_EXPIRES_IN = "30m";
export const REFRESH_TOKEN_EXPIRES_IN = "7d";
export const ACCESS_TOKEN_MAX_AGE_SEC = 30 * 60;
export const REFRESH_TOKEN_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type AuthTokenPayload = JwtPayload & {
  userId: string;
  role: string;
  type: "access" | "refresh";
  jti?: string;
};

export const createRefreshTokenId = (): string => crypto.randomUUID();

export const signAccessToken = (userId: string, role: string, secret: string): string =>
  jwt.sign({ userId, role, type: "access" }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

export const signRefreshToken = (
  userId: string,
  role: string,
  refreshTokenId: string,
  secret: string,
): string =>
  jwt.sign(
    { userId, role, type: "refresh", jti: refreshTokenId },
    secret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );

export const verifyRefreshToken = (token: string, secret: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, secret) as AuthTokenPayload;
  if (decoded.type !== "refresh" || !decoded.jti) {
    throw new Error("Refresh token không hợp lệ");
  }
  return decoded;
};

export const tryVerifyAccessToken = (token: string, secret: string): AuthTokenPayload | null => {
  try {
    const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
    const decoded = jwt.verify(raw, secret) as AuthTokenPayload;
    if (decoded.type && decoded.type !== "access") return null;
    if (!decoded.userId) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const getAccessTokenFromRequest = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.length > 0) return authHeader;

  const legacyHeader = (req.headers as { token?: string }).token;
  if (typeof legacyHeader === "string" && legacyHeader.length > 0) return legacyHeader;

  return undefined;
};

export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
  if (typeof bodyToken === "string" && bodyToken.trim()) return bodyToken.trim();
  return undefined;
};

export const setAuthCookies = (
  res: { append?: (name: string, value: string) => void; setHeader: (name: string, value: string) => void },
  accessToken: string,
  refreshToken: string,
) => {
  const cookies = [
    `access_token=${accessToken}; HttpOnly; Path=/; Max-Age=${ACCESS_TOKEN_MAX_AGE_SEC}; SameSite=Lax`,
    `refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=${REFRESH_TOKEN_MAX_AGE_SEC}; SameSite=Lax`,
  ];
  if (typeof res.append === "function") {
    cookies.forEach((cookie) => res.append!("Set-Cookie", cookie));
    return;
  }
  res.setHeader("Set-Cookie", cookies.join(", "));
};

export const clearAuthCookies = (res: {
  clearCookie?: (name: string, options?: { path?: string }) => void;
  append?: (name: string, value: string) => void;
  setHeader?: (name: string, value: string) => void;
}) => {
  if (typeof res.clearCookie === "function") {
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    return;
  }
  const expired = [
    "access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    "refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
  ];
  if (typeof res.append === "function") {
    expired.forEach((cookie) => res.append!("Set-Cookie", cookie));
    return;
  }
  res.setHeader?.("Set-Cookie", expired.join(", "));
};
