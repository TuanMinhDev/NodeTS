import mongoose, { Schema, Document } from "mongoose";

export interface IShippingShipment extends Document {
  orderId: mongoose.Types.ObjectId;
  /** sellerId = userId của admin/shop */
  sellerId: mongoose.Types.ObjectId;
  trackingNumber: string | null;
  trackingUrl: string | null;
  /** Trạng thái vận chuyển chi tiết (pending, in_transit, delivered, cancelled, ...) */
  status: string;
  /** Chiều vận đơn: giao đi hoặc hoàn */
  direction: "OUTBOUND" | "RETURN";
  shippingFee: number;
  insuranceFee: number;
  codAmount: number;
  weight: number; // kg
  /** GHTK metadata (area, estimatedPickTime, ...) */
  metadata: string;
  statusUpdatedAt: Date | null;
  lastSyncedAt: Date | null;
  lastSyncedFrom: string | null;
}

const shippingShipmentSchema = new Schema<IShippingShipment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      default: null,
      index: true,
    },
    trackingUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "in_transit",
        "delivered",
        "cancelled",
        "cannot_pickup",
        "cannot_deliver",
        "delay_pickup",
        "delay_delivery",
        "returning",
        "returned",
        "refunded",
        "reconciled_return",
      ],
      default: "pending",
    },
    direction: {
      type: String,
      enum: ["OUTBOUND", "RETURN"],
      default: "OUTBOUND",
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    insuranceFee: {
      type: Number,
      default: 0,
    },
    codAmount: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: String,
      default: "{}",
    },
    statusUpdatedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSyncedFrom: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound index: tìm shipment theo đơn + hướng giao
shippingShipmentSchema.index({ orderId: 1, direction: 1 });

const ShippingShipment = mongoose.model<IShippingShipment>(
  "ShippingShipment",
  shippingShipmentSchema,
);

export default ShippingShipment;
