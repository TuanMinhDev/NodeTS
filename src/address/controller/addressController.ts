import { Request, Response } from "express";
import mongoose from "mongoose";
import Address from "../model/addressModel";
import { AuthedRequest } from "../../_component";

export const createAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { fullName, phoneNumber, address, city, district, ward, isDefault } = req.body;

        if (!fullName || !phoneNumber || !address || !city || !district || !ward) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        }

        // If this is set as default, unset other default addresses
        if (isDefault) {
            await Address.updateMany({ userId }, { isDefault: false });
        }

        const addressDoc = new Address({
            userId,
            fullName,
            phoneNumber,
            address,
            city,
            district,
            ward,
            isDefault: isDefault || false,
        });

        const savedAddress = await addressDoc.save();
        res.status(201).json({ message: "Tạo địa chỉ thành công", address: savedAddress });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAddresses = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
        res.status(200).json({ message: "Lấy danh sách địa chỉ thành công", addresses });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const address = await Address.findOne({ _id: id, userId });

        if (!address) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        res.status(200).json({ message: "Lấy địa chỉ thành công", address });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const { fullName, phoneNumber, address, city, district, ward, isDefault } = req.body;

        // If this is set as default, unset other default addresses
        if (isDefault) {
            await Address.updateMany({ userId, _id: { $ne: id } }, { isDefault: false });
        }

        const addressDoc = await Address.findOneAndUpdate(
            { _id: id, userId },
            { fullName, phoneNumber, address, city, district, ward, isDefault },
            { new: true, runValidators: true }
        );

        if (!addressDoc) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        res.status(200).json({ message: "Cập nhật địa chỉ thành công", address: addressDoc });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;
        const address = await Address.findOneAndDelete({ _id: id, userId });

        if (!address) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        res.status(200).json({ message: "Xóa địa chỉ thành công" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const setDefaultAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { id } = req.params;

        // Unset all default addresses for this user
        await Address.updateMany({ userId }, { isDefault: false });

        // Set this address as default
        const address = await Address.findOneAndUpdate(
            { _id: id, userId },
            { isDefault: true },
            { new: true }
        );

        if (!address) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        res.status(200).json({ message: "Đặt địa chỉ mặc định thành công", address });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
