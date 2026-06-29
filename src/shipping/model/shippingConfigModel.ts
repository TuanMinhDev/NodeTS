import mongoose, { Schema, Document } from "mongoose";

/**
 * ShippingConfig — Lưu cấu hình vận chuyển GHTK
 *
 * Dùng singleton pattern: chỉ có 1 document (key: "ghtk").
 * Admin cập nhật qua API, backend đọc khi tạo GhtkClient.
 */
export interface IShippingConfig extends Document {
  key: string;
  apiToken: string;
  shopCode: string;
  apiUrl: string;
  customerWebsite: string;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
}

const shippingConfigSchema = new Schema<IShippingConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "ghtk",
    },
    apiToken: {
      type: String,
      default: "",
    },
    shopCode: {
      type: String,
      default: "",
    },
    apiUrl: {
      type: String,
      default: "https://services.giaohangtietkiem.vn",
    },
    customerWebsite: {
      type: String,
      default: "https://khachhang-staging.ghtklab.com",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const ShippingConfig = mongoose.model<IShippingConfig>(
  "ShippingConfig",
  shippingConfigSchema,
);

export default ShippingConfig;
