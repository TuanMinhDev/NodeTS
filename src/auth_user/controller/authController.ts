import { Request, Response } from "express";
import userModel from "../model/userModel";
import authModel from "../model/authModel";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, address, phoneNumber, role } = req.body;

        if (!email || !password || !name || !address || !phoneNumber) {
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
        const user = await userModel.create({ email, name, address, phoneNumber, role });
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

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

        res.setHeader(
            "Set-Cookie",
            `access_token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`
        );

        return res.status(200).json({
            message: "Đăng nhập thành công",
            token: token,
            
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        res.clearCookie("access_token");
        return res.status(200).json({ message: "Đăng xuất thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
}

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
        await auth.save();

        return res.status(200).json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
}

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "Chưa nhập refresh token" });
        }

        if (!JWT_SECRET) {
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        // Verify refresh token
        jwt.verify(refreshToken, JWT_SECRET, (err: any, decoded: any) => {
            if (err || !decoded) {
                return res.status(401).json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
            }

            const payload = decoded as { userId: string, role: string };
            
            // Tạo access token mới
            const newAccessToken = jwt.sign(
                { userId: payload.userId, role: payload.role },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            // Có thể tạo cả refresh token mới nếu muốn (Refresh Token Rotation)
            const newRefreshToken = jwt.sign(
                { userId: payload.userId, role: payload.role },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.setHeader(
                "Set-Cookie",
                `access_token=${newAccessToken}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`
            );

            return res.status(200).json({
                message: "Lấy token mới thành công",
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error });
    }
}