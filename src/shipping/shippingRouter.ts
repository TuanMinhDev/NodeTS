import express from "express";
import { checkPermission } from "../auth_user/middleware";
import {
  calculateShippingFee,
  createShipment,
  cancelShipment,
  getShipmentStatus,
  handleWebhook,
  getShippingConfig,
  updateShippingConfig,
} from "./controller/shippingController";

const shippingRouter = express.Router();

// Admin — cấu hình GHTK (API Token, Shop Code)
shippingRouter.get("/config", checkPermission(["admin"]), getShippingConfig);
shippingRouter.put("/config", checkPermission(["admin"]), updateShippingConfig);

// Buyer / Checkout — tính phí vận chuyển GHTK
shippingRouter.get("/fee", checkPermission(["admin", "user"]), calculateShippingFee);

// Seller — tạo vận đơn GHTK
shippingRouter.post("/create-shipment/:orderId", checkPermission(["admin"]), createShipment);

// Seller — hủy vận đơn GHTK
shippingRouter.post("/cancel/:orderId", checkPermission(["admin"]), cancelShipment);

// Tra cứu trạng thái shipment
shippingRouter.get("/status/:orderId", checkPermission(["admin", "user"]), getShipmentStatus);

// Webhook GHTK — public (không cần auth)
shippingRouter.post("/webhook/ghtk", handleWebhook);

export default shippingRouter;

