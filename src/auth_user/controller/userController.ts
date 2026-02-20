import { Request, Response } from "express";
import userModel from "../model/userModel";

type AuthedRequest = Request & { user?: { userId?: string } | string };

export const getMe = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = typeof req.user === "string" ? req.user : req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Chưa xác thực" });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error });
    }
};

export const updateInfoUser = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = typeof req.user === "string" ? req.user : req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Chưa xác thực" });
        }

        const { name, email, address, phoneNumber } = req.body;

        if (!name || !email || !address || !phoneNumber) {
            return res.status(400).json({ message: "Chưa nhập đầy đủ dữ liệu" });
        }

        const checkEmail = await userModel.findOne({ email, _id: { $ne: userId } });
        if (checkEmail) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }
        const checkPhoneNumber = await userModel.findOne({ phoneNumber, _id: { $ne: userId } });
        if (checkPhoneNumber) {
            return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { name, email, address, phoneNumber },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        return res.status(200).json({ message: "Cập nhật thành công" });

    }
    catch (error) {
        return res.status(500).json({ message: "Lỗi server", error });
    }
}

export const getAllUser = async (req: AuthedRequest, res: Response) => {
    try {
        const users = await userModel.find();
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ message: "Lỗi server", error });
    }
}

export const deleteUser = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ message: "Thiếu id" });
        }
        const user = await userModel.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }
        return res.status(200).json({ message: "Xóa user thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error });
    }
}