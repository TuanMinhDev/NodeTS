import { Request, Response } from "express";
import mongoose from "mongoose";
import userModel from "../model/userModel";
import Address from "../../address/model/addressModel";
import { pickShopOriginAddress } from "../../address/pickShopOriginAddress";

type AuthedRequest = Request & { user?: { userId?: string } | string };

/** Trang shop công khai: tên cửa hàng + khu vực xuất hàng (tỉnh/TP + xã/phường), không lộ SĐT/đường. */
export const getPublicSellerProfile = async (req: Request, res: Response) => {
    try {
        const raw = req.params.sellerId;
        const sellerId = Array.isArray(raw) ? raw[0] : raw;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: "sellerId không hợp lệ" });
        }

        const shopAccount = await userModel.findOne({ _id: sellerId, role: "admin" }).select("name");
        if (!shopAccount) {
            return res.status(404).json({ message: "Không tìm thấy cửa hàng" });
        }

        const addrDoc = await Address.findOne({ userId: sellerId });
        const origin = pickShopOriginAddress(addrDoc?.addresses as unknown[]);
        const warehouse = origin ? { province: origin.province, ward: origin.ward } : null;

        return res.status(200).json({
            data: {
                sellerId: shopAccount._id.toString(),
                shopName: shopAccount.name,
                warehouse,
            },
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

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
        const { name, role, search, keyword, q } = req.query;

        const filter: any = {};

        // Ưu tiên các query phổ biến trên FE: search / keyword / q / name
        const rawSearch =
            (typeof search === "string" && search) ||
            (typeof keyword === "string" && keyword) ||
            (typeof q === "string" && q) ||
            (typeof name === "string" && name) ||
            (Array.isArray(search) && search[0]) ||
            (Array.isArray(keyword) && keyword[0]) ||
            (Array.isArray(q) && q[0]) ||
            (Array.isArray(name) && name[0]) ||
            "";

        const nameStr = String(rawSearch).trim();
        if (nameStr) {
            filter.name = { $regex: nameStr, $options: "i" };
        }

        const roleStr =
            (typeof role === "string" && role) ||
            (Array.isArray(role) && role[0]) ||
            "";

        if (roleStr) {
            filter.role = roleStr;
        }

        const users = await userModel.find(filter);
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