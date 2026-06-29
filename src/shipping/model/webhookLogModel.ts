import mongoose, { Schema, Document } from "mongoose";

export interface IShippingWebhookLog extends Document {
  rawPayload: string;
  shipmentId: mongoose.Types.ObjectId | null;
  ipAddress: string | null;
  processed: boolean;
  processedAt: Date | null;
  processingError: string | null;
}

const shippingWebhookLogSchema = new Schema<IShippingWebhookLog>(
  {
    rawPayload: {
      type: String,
      required: true,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "ShippingShipment",
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const ShippingWebhookLog = mongoose.model<IShippingWebhookLog>(
  "ShippingWebhookLog",
  shippingWebhookLogSchema,
);

export default ShippingWebhookLog;
