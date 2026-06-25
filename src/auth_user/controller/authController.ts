import { Request, Response } from "express";
import userModel from "../model/userModel";
import authModel from "../model/authModel";
import dotenv from "dotenv";
import {
    ACCESS_TOKEN_MAX_AGE_SEC,
    clearAuthCookies,
    createRefreshTokenId,
    getAccessTokenFromRequest,
    getRefreshTokenFromRequest,
    setAuthCookies,
    signAccessToken,
    signRefreshToken,
    tryVerifyAccessToken,
    verifyRefreshToken,
} from "../token.util";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const invalidateRefreshSession = async (userId: string) => {
    await authModel.updateOne({ userId }, { $set: { refreshTokenId: null } });
};

const issueTokenPair = async (userId: string, role: string) => {
    if (!JWT_SECRET) throw new Error("Lỗi hệ thống");

    const refreshTokenId = createRefreshTokenId();
    await authModel.updateOne({ userId }, { $set: { refreshTokenId } });

    const accessToken = signAccessToken(userId, role, JWT_SECRET);
    const refreshToken = signRefreshToken(userId, role, refreshTokenId, JWT_SECRET);

    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, phoneNumber } = req.body;

        if (!email || !password || !name  || !phoneNumber) {
            return res.status(400).json({ message: "Chưa nhập đầy đủ dữ liệu" });
        }
        const checkEmail = await userModel.findOne({ email });
        if (checkEmail) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }
        const checkPhoneNumber = await userModel.findOne({ phoneNumber });
        if (checkPhoneNumber) {
            return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
        }
        // Chỉ tạo tài khoản buyer; vai trò admin do hệ thống gán riêng, không nhận từ client
        const user = await userModel.create({ email, name, phoneNumber, role: "user" });
        await authModel.create({ user_name: email, password, userId: user._id });
        res.status(201).json({ message: "Đăng ký thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Chưa nhập đầy đủ dữ liệu" });
        }

        const isEmail = typeof identifier === "string" && identifier.includes("@");

        const user = await userModel.findOne(isEmail ? { email: identifier } : { phoneNumber: identifier });
        if (!user) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        const auth = await authModel.findOne({ userId: user._id });
        if (!auth) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        if (auth.password !== password) {
            return res.status(400).json({ message: "Mật khẩu không đúng" });
        }

        if (!JWT_SECRET) {
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        const { accessToken, refreshToken } = await issueTokenPair(user._id.toString(), user.role);
        setAuthCookies(res, accessToken, refreshToken);

        return res.status(200).json({
            message: "Đăng nhập thành công",
            token: accessToken,
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TOKEN_MAX_AGE_SEC,
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        if (!JWT_SECRET) {
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        let userId: string | null = null;

        const accessToken = getAccessTokenFromRequest(req);
        if (accessToken) {
            const decoded = tryVerifyAccessToken(accessToken, JWT_SECRET);
            if (decoded?.userId) userId = decoded.userId;
        }

        const refreshToken = getRefreshTokenFromRequest(req);
        if (!userId && refreshToken) {
            try {
                const decoded = verifyRefreshToken(refreshToken, JWT_SECRET);
                userId = decoded.userId;
            } catch {
                // refresh hết hạn hoặc không hợp lệ — vẫn xóa cookie/local phía client
            }
        }

        if (userId) {
            await invalidateRefreshSession(userId);
        }

        clearAuthCookies(res);
        return res.status(200).json({ message: "Đăng xuất thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Chưa nhập đầy đủ dữ liệu" });
        }

        const userId = typeof (req as any).user === "string" ? (req as any).user : (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Chưa xác thực" });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: "Mật khẩu mới không được trùng mật khẩu cũ" });
        }

        const auth = await authModel.findOne({ userId });
        if (!auth) {
            return res.status(404).json({ message: "Không tìm thấy auth" });
        }

        if (auth.password !== oldPassword) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
        }

        auth.password = newPassword;
        auth.refreshTokenId = null;
        await auth.save();

        clearAuthCookies(res);
        return res.status(200).json({
            message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const incomingRefreshToken = getRefreshTokenFromRequest(req);
        if (!incomingRefreshToken) {
            return res.status(400).json({ message: "Thiếu refresh token" });
        }

        if (!JWT_SECRET) {
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(incomingRefreshToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
        }

        const auth = await authModel.findOne({ userId: decoded.userId });
        if (!auth || !auth.refreshTokenId || auth.refreshTokenId !== decoded.jti) {
            return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
        }

        const user = await userModel.findById(decoded.userId).select("role");
        if (!user) {
            return res.status(401).json({ message: "Tài khoản không tồn tại" });
        }

        const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
            user._id.toString(),
            user.role,
        );

        setAuthCookies(res, accessToken, newRefreshToken);

        return res.status(200).json({
            message: "Lấy token mới thành công",
            token: accessToken,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: ACCESS_TOKEN_MAX_AGE_SEC,
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};
