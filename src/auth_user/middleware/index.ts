import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

type AuthTokenPayload = JwtPayload & {
  userId: string;
  role: string;
};

type AuthedRequest = Request & { user?: AuthTokenPayload & { id?: string } };

const getAccessTokenFromRequest = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.length > 0) return authHeader;

  const legacyHeader = (req.headers as any).token;
  if (typeof legacyHeader === "string" && legacyHeader.length > 0) return legacyHeader;

  return undefined;
};

export const verifyToken = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const tokenValue = getAccessTokenFromRequest(req);

  if (!tokenValue) {
    return res.status(401).json({ message: "Thiếu token" });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ message: "Thiếu JWT_SECRET" });
  }

  const accessToken = tokenValue.startsWith("Bearer ") ? tokenValue.slice(7) : tokenValue;

  jwt.verify(accessToken, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const payload = decoded as AuthTokenPayload;
    if (!payload.userId || !payload.role) {
      return res.status(401).json({ message: "Token thiếu thông tin" });
    }

    req.user = payload;
    next();
  });
};

export const checkPermission = (roles: string[]) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    verifyToken(req, res, () => {
      if (req.user && roles.includes(req.user.role)) {
        req.user.id = req.user.userId;
        next();
      } else {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
      }
    });
  };
};

export const checkId = () => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    verifyToken(req, res, () => {
      const paramId = req.params.id;
      const userId = req.user?.userId;

      if (!paramId) {
        return res.status(400).json({ message: "Thiếu id" });
      }

      if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
      }

      if (userId === paramId) {
        return next();
      }

      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    });
  };
};

