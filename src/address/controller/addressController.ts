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

        if (!fullName || !phoneNumber || !province || !district || !ward) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc (fullName, phoneNumber, province, district, ward)" });
        }

        const validTypes = ["home", "office", "warehouse"];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ message: "type không hợp lệ, chỉ chấp nhận: home, office, warehouse" });
        }

        const newItem: any = { fullName, phoneNumber, province, district, ward, street, isDefault: isDefault || false, type: type || "home" };

        let doc = await Address.findOne({ userId });

        if (!doc) {
            if (role === "seller" && newItem.type !== "warehouse") {
                return res.status(400).json({ message: "Seller phải có ít nhất 1 địa chỉ kho hàng (warehouse). Vui lòng thêm địa chỉ warehouse trước" });
            }
            doc = await Address.create({ userId, addresses: [newItem] });
            const added = doc.addresses[doc.addresses.length - 1];
            return res.status(201).json({ message: "Thêm địa chỉ thành công", data: added });
        }

        if (role === "seller") {
            const hasWarehouse = doc.addresses.some((a: any) => a.type === "warehouse");
            if (!hasWarehouse && newItem.type !== "warehouse") {
                return res.status(400).json({ message: "Seller phải có ít nhất 1 địa chỉ kho hàng (warehouse). Vui lòng thêm địa chỉ warehouse trước" });
            }
            if (hasWarehouse && newItem.type === "warehouse") {
                return res.status(400).json({ message: "Seller chỉ được có 1 địa chỉ kho hàng (warehouse)" });
            }
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
        const role = req.user?.role;

        const validTypes = ["home", "office", "warehouse"];
        if (type !== undefined && !validTypes.includes(type)) {
            return res.status(400).json({ message: "type không hợp lệ, chỉ chấp nhận: home, office, warehouse" });
        }

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const item = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!item) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        if (role === "seller" && type !== undefined) {
            const isCurrentWarehouse = (item as any).type === "warehouse";
            const hasOtherWarehouse = doc.addresses.some((a: any) => a._id.toString() !== id && a.type === "warehouse");

            // Không được đổi warehouse duy nhất sang type khác
            if (isCurrentWarehouse && type !== "warehouse" && !hasOtherWarehouse) {
                return res.status(400).json({ message: "Không thể thay đổi: Seller phải có ít nhất 1 địa chỉ kho hàng (warehouse)" });
            }
            // Không được đổi địa chỉ khác thành warehouse khi đã có rồi
            if (!isCurrentWarehouse && type === "warehouse" && hasOtherWarehouse) {
                return res.status(400).json({ message: "Seller chỉ được có 1 địa chỉ kho hàng (warehouse)" });
            }
        }

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

        const id = req.params.id as string;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "id địa chỉ không hợp lệ" });
        }

        const role = req.user?.role;

        const doc = await Address.findOne({ userId });
        if (!doc) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const target = doc.addresses.find((a: any) => a._id.toString() === id);
        if (!target) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        // Seller không được xóa warehouse cuối cùng
        if (role === "seller" && (target as any).type === "warehouse") {
            const warehouseCount = doc.addresses.filter((a: any) => a.type === "warehouse").length;
            if (warehouseCount <= 1) {
                return res.status(400).json({ message: "Không thể xóa: Seller phải có ít nhất 1 địa chỉ kho hàng (warehouse)" });
            }
        }

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
