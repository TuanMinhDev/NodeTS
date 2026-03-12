import { Request, Response } from "express";
import Category from "../model/categoryModel";

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, image } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Tên danh mục là bắt buộc" });
        }

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: "Danh mục đã tồn tại" });
        }

        const category = new Category({
            name,
            description,
            image,
        });

        const savedCategory = await category.save();
        res.status(201).json({ message: "Tạo danh mục thành công", category: savedCategory });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json({ message: "Lấy danh sách danh mục thành công", categories });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }

        res.status(200).json({ message: "Lấy danh mục thành công", category });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, image, isActive } = req.body;

        const category = await Category.findByIdAndUpdate(
            id,
            { name, description, image, isActive },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }

        res.status(200).json({ message: "Cập nhật danh mục thành công", category });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }

        res.status(200).json({ message: "Xóa danh mục thành công", category });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
