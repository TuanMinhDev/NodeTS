import { Response } from "express";
import mongoose from "mongoose";
import Address from "../model/addressModel";
import { AuthedRequest } from "../../_component";

// Thêm 1 địa chỉ vào mảng addresses của user
export const addAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const { fullName, phoneNumber, province, district, ward, street, isDefault, type } = req.body;
        const role = req.user?.role;

        if (!fullName || !phoneNumber || !province || !ward) {
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc (fullName, phoneNumber, province, ward)",
            });
        }

        const validTypes = ["home", "office", "warehouse"];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ message: "type không hợp lệ, chỉ chấp nhận: home, office, warehouse" });
        }

        const newItem: any = {
            fullName,
            phoneNumber,
            province,
            ...(typeof district === "string" && district.trim() !== "" ? { district: district.trim() } : {}),
            ward,
            street,
            isDefault: isDefault || false,
            type: type || "home",
        };

        let doc = await Address.findOne({ userId });

        if (role === "admin") {
            if (doc && doc.addresses.length >= 1) {
                return res.status(400).json({ message: "Tài khoản admin chỉ được có một địa chỉ. Dùng cập nhật (PUT) thay cho thêm mới." });
            }
        }

        if (!doc) {
            doc = await Address.create({ userId, addresses: [newItem] });
            const added = doc.addresses[doc.addresses.length - 1];
            return res.status(201).json({ message: "Thêm địa chỉ thành công", data: added });
        }

        // Nếu isDefault, bỏ default của các địa chỉ cũ
        if (isDefault) {
            doc.addresses.forEach((a: any) => { a.isDefault = false; });
        }

        doc.addresses.push(newItem);
        await doc.save();

        const added = doc.addresses[doc.addresses.length - 1];
        return res.status(201).json({ message: "Thêm địa chỉ thành công", data: added });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Lấy tất cả địa chỉ của user hiện tại
export const getAddresses = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const page  = Math.max(1, Number(req.query.pageNumber) || 1);
        const limit = Math.max(1, Number(req.query.pageSize)   || 10);
        const skip  = (page - 1) * limit;

        const doc = await Address.findOne({ userId });
        const all = doc?.addresses ?? [];

        const totalItems = all.length;
        const totalPages = Math.ceil(totalItems / limit);
        const items      = all.slice(skip, skip + limit);

        return res.status(200).json({
            items,
            totalItems,
            totalPages,
            currentPage: page,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Lấy chi tiết 1 địa chỉ theo id của subdocument
export const getAddressById = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "id địa chỉ không hợp lệ" });
        }

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const item = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!item) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        return res.status(200).json({ data: item });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Sửa 1 địa chỉ theo id của subdocument
export const updateAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "id địa chỉ không hợp lệ" });
        }

        const { fullName, phoneNumber, province, district, ward, street, isDefault, type } = req.body;

        const validTypes = ["home", "office", "warehouse"];
        if (type !== undefined && !validTypes.includes(type)) {
            return res.status(400).json({ message: "type không hợp lệ, chỉ chấp nhận: home, office, warehouse" });
        }

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const item = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!item) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        if (isDefault) {
            doc.addresses.forEach((a: any) => { a.isDefault = false; });
        }

        if (fullName    !== undefined) (item as any).fullName    = fullName;
        if (phoneNumber !== undefined) (item as any).phoneNumber = phoneNumber;
        if (province    !== undefined) (item as any).province    = province;
        if (district    !== undefined) (item as any).district    = district;
        if (ward        !== undefined) (item as any).ward        = ward;
        if (street      !== undefined) (item as any).street      = street;
        if (isDefault   !== undefined) (item as any).isDefault   = isDefault;
        if (type        !== undefined) (item as any).type        = type;

        await doc.save();
        return res.status(200).json({ message: "Cập nhật địa chỉ thành công", data: item });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Xoá 1 địa chỉ theo id của subdocument
export const deleteAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const role = req.user?.role;
        if (role === "admin") {
            return res.status(400).json({ message: "Tài khoản admin không được xóa địa chỉ; chỉnh sửa bằng PUT." });
        }

        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "id địa chỉ không hợp lệ" });
        }

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const target = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!target) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const before = doc.addresses.length;
        doc.addresses = doc.addresses.filter((a: any) => a._id.toString() !== id) as any;

        if (doc.addresses.length === before) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        await doc.save();
        return res.status(200).json({ message: "Xóa địa chỉ thành công" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Đặt 1 địa chỉ làm mặc định
export const setDefaultAddress = async (req: AuthedRequest, res: Response) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "id địa chỉ không hợp lệ" });
        }

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const item = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!item) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        doc.addresses.forEach((a: any) => { a.isDefault = false; });
        (item as any).isDefault = true;

        await doc.save();
        return res.status(200).json({ message: "Đặt địa chỉ mặc định thành công", data: item });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
