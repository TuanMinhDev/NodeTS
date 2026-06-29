/**
 * Shipping Controller — GHTK Integration
 *
 * Endpoints:
 *  GET  /shipping/fee                     — Tính phí vận chuyển GHTK
 *  POST /shipping/create-shipment/:orderId — Tạo vận đơn GHTK
 *  POST /shipping/cancel/:orderId         — Hủy vận đơn GHTK
 *  GET  /shipping/status/:orderId         — Tra cứu trạng thái shipment
 *  POST /shipping/webhook/ghtk            — Nhận webhook từ GHTK
 */

import { Request, Response } from "express";
import { AuthedRequest } from "../../_component";
import Order from "../../order/model/orderModel";
import Address from "../../address/model/addressModel";
import { pickShopOriginAddress } from "../../address/pickShopOriginAddress";
import ShippingShipment from "../model/shipmentModel";
import ShippingWebhookLog from "../model/webhookLogModel";
import {
  createGhtkClient,
  createGhtkClientAsync,
  buildGhtkTrackingUrl,
  getGhtkStatusMessage,
  mapGhtkStatusToShippingStatus,
  mapShippingStatusToOrderStatus,
  mapGhtkStatusToOrderStatus,
  isGhtkOrderDelivered,
  resolveGhtkOutboundAmounts,
  formatGhtkErrorMessage,
  parseWebhookPayload,
  invalidateGhtkConfigCache,
  GhtkApiError,
  GhtkOrderData,
  GhtkProduct,
} from "../ghtk";
import {
  notifyOrderStatusUpdated,
} from "../../notification/service/notificationService";

const TAG = "[GHTK]";

// ════════════════════════════════════════════════════════════════════════
// GET /shipping/fee — Tính phí vận chuyển GHTK
// ════════════════════════════════════════════════════════════════════════

export const calculateShippingFee = async (req: AuthedRequest, res: Response) => {
  try {
    const {
      pick_province: pick_province_raw,
      pick_district: pick_district_raw,
      pick_ward: pick_ward_raw,
      province,
      district,
      ward,
      weight,
      value,
      sellerId,
    } = req.query as Record<string, string>;

    let pick_province = pick_province_raw;
    let pick_district = pick_district_raw;
    let pick_ward = pick_ward_raw;

    // Nếu không có pick_province nhưng có sellerId → tự lấy từ DB
    if (!pick_province && sellerId) {
      const sellerAddressDoc = await Address.findOne({ userId: sellerId });
      const sellerOrigin = pickShopOriginAddress(sellerAddressDoc?.addresses as unknown[]);
      if (sellerOrigin) {
        pick_province = sellerOrigin.province;
        if (!pick_district && sellerOrigin.district) pick_district = sellerOrigin.district;
        if (!pick_ward && sellerOrigin.ward) pick_ward = sellerOrigin.ward;
      }
    }

    if (!pick_province || !province || !weight) {
      return res.status(400).json({
        success: false,
        error: "Thiếu tham số bắt buộc: pick_province (hoặc sellerId), province, weight",
      });
    }

    const client = await createGhtkClientAsync();
    const params: Record<string, string | number> = {
      pick_province,
      province,
      weight: parseInt(weight, 10),
    };
    if (pick_district) params.pick_district = pick_district;
    if (pick_ward) params.pick_ward = pick_ward;
    if (district) params.district = district;
    if (ward) params.ward = ward;
    if (value) params.value = parseInt(value, 10);

    // GHTK bắt buộc pick_district + district
    if (!params.pick_district && params.pick_ward) {
      params.pick_district = params.pick_ward;
    }
    if (!params.district && params.ward) {
      params.district = params.ward;
    }

    console.log(`${TAG} calculateShippingFee params:`, params);

    const fee = await client.calculateShippingFee(params as any);

    return res.status(200).json({ success: true, data: fee });
  } catch (error: any) {
    console.error(`${TAG} calculateShippingFee error:`, error.message);
    if (error instanceof GhtkApiError) {
      return res.status(400).json({
        success: false,
        error: formatGhtkErrorMessage(error.code, error.message),
        errorCode: error.code,
      });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════
// POST /shipping/create-shipment/:orderId — Tạo vận đơn GHTK
// ════════════════════════════════════════════════════════════════════════

export const createShipment = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { orderId } = req.params;
    console.log(`\n📦 ${TAG} ========== CREATE SHIPMENT ==========`);
    console.log(`📦 ${TAG} orderId: ${orderId}, userId: ${userId}`);

    // 1. Tìm đơn hàng
    const order = await Order.findById(orderId).populate("items.productId");
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // 2. Kiểm tra quyền (chỉ seller mới tạo vận đơn)
    if (order.sellerId.toString() !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền tạo vận đơn cho đơn này" });
    }

    // 3. Kiểm tra shipment đã tồn tại
    const existingShipment = await ShippingShipment.findOne({ orderId: order._id });
    if (existingShipment) {
      return res.status(200).json({
        message: "Vận đơn đã tồn tại",
        shipment: {
          id: existingShipment._id,
          trackingNumber: existingShipment.trackingNumber,
          trackingUrl: existingShipment.trackingUrl,
          status: existingShipment.status,
        },
      });
    }

    // 4. Lấy địa chỉ pickup (seller)
    const sellerAddressDoc = await Address.findOne({ userId: order.sellerId });
    const sellerOrigin = pickShopOriginAddress(sellerAddressDoc?.addresses as unknown[]);

    if (!sellerOrigin) {
      return res.status(400).json({ message: "Cửa hàng chưa cấu hình địa chỉ xuất hàng" });
    }

    // 5. Parse shipping address từ đơn
    const sa = order.shippingAddress as any;
    if (!sa?.fullName || !sa?.phoneNumber || !sa?.address) {
      return res.status(400).json({ message: "Đơn hàng thiếu địa chỉ giao hàng" });
    }

    const deliveryProvince = sa.province || sa.city || "";
    const deliveryWard = sa.ward || "";
    const deliveryDistrict = sa.district || deliveryWard;

    // 6. Build GHTK products
    const ghtkProducts: GhtkProduct[] = (order.items as any[]).map((item) => {
      const product = item.productId;
      return {
        name: typeof product === "object" ? (product.name || "Sản phẩm") : "Sản phẩm",
        weight: 0.1, // Mặc định 100g/sản phẩm
        quantity: item.quantity,
        price: item.price,
      };
    });

    const totalWeightKg = ghtkProducts.reduce(
      (sum, p) => sum + p.weight * (p.quantity || 1),
      0,
    );

    // 7. Tính COD + khai giá
    const amounts = resolveGhtkOutboundAmounts({
      totalPrice: order.totalPrice,
      shippingFee: order.shippingFee,
    });

    // 8. Build GHTK order data
    const ghtkOrderData: GhtkOrderData = {
      id: order.orderCode,
      pick_name: sellerOrigin.fullName,
      pick_address: sellerOrigin.address || sellerOrigin.ward,
      pick_province: sellerOrigin.province,
      pick_district: sellerOrigin.district,
      pick_ward: sellerOrigin.ward,
      pick_tel: sellerOrigin.phoneNumber,
      pick_money: amounts.pickMoney,
      pick_option: "cod",
      name: sa.fullName,
      address: `${sa.address}, ${deliveryWard}`,
      province: deliveryProvince,
      district: deliveryDistrict,
      ward: deliveryWard,
      hamlet: "Khác",
      tel: sa.phoneNumber,
      return_name: sellerOrigin.fullName,
      return_address: sellerOrigin.address || sellerOrigin.ward,
      return_province: sellerOrigin.province,
      return_district: sellerOrigin.district,
      return_tel: sellerOrigin.phoneNumber,
      value: amounts.value,
      is_freeship: amounts.isFreeship,
      transport: "road",
      total_weight: totalWeightKg,
      note: `Đơn ${order.orderCode}`,
    };

    console.log(`📤 ${TAG} Sending to GHTK:`, {
      partnerId: ghtkOrderData.id,
      pickProvince: ghtkOrderData.pick_province,
      deliveryProvince: ghtkOrderData.province,
      totalWeight: `${totalWeightKg.toFixed(2)}kg`,
      codAmount: amounts.pickMoney,
    });

    // 9. Gọi GHTK API
    const client = await createGhtkClientAsync();
    const ghtkResponse = await client.createOrder({
      products: ghtkProducts,
      order: ghtkOrderData,
    });

    console.log(`✅ ${TAG} GHTK response:`, {
      label: ghtkResponse.label,
      trackingId: ghtkResponse.tracking_id,
      fee: ghtkResponse.fee,
    });

    // 10. Lưu shipment vào DB
    const shipment = await ShippingShipment.create({
      orderId: order._id,
      sellerId: order.sellerId,
      trackingNumber: ghtkResponse.label,
      trackingUrl: buildGhtkTrackingUrl(ghtkResponse.label),
      status: "pending",
      direction: "OUTBOUND",
      shippingFee: ghtkResponse.fee,
      insuranceFee: ghtkResponse.insurance_fee,
      codAmount: amounts.pickMoney,
      weight: totalWeightKg,
      metadata: JSON.stringify({
        area: ghtkResponse.area,
        estimatedPickTime: ghtkResponse.estimated_pick_time,
        estimatedDeliverTime: ghtkResponse.estimated_deliver_time,
        statusId: ghtkResponse.status_id,
      }),
    });

    // 11. Cập nhật order status → shipping
    if (order.status === "pending") {
      await Order.findByIdAndUpdate(order._id, {
        status: "shipping",
        shippingStatus: "pending",
        shippingFee: ghtkResponse.fee,
      });
    }

    console.log(`✅ ${TAG} Shipment created: ${shipment._id}`);

    return res.status(201).json({
      message: "Tạo vận đơn thành công",
      shipment: {
        id: shipment._id,
        trackingNumber: ghtkResponse.label,
        trackingUrl: buildGhtkTrackingUrl(ghtkResponse.label),
        fee: ghtkResponse.fee,
        estimatedPickTime: ghtkResponse.estimated_pick_time,
        estimatedDeliverTime: ghtkResponse.estimated_deliver_time,
      },
    });
  } catch (error: any) {
    console.error(`❌ ${TAG} createShipment error:`, error.message);
    if (error instanceof GhtkApiError) {
      return res.status(400).json({
        message: formatGhtkErrorMessage(error.code, error.message),
        errorCode: error.code,
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════
// POST /shipping/cancel/:orderId — Hủy vận đơn
// ════════════════════════════════════════════════════════════════════════

export const cancelShipment = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (order.sellerId.toString() !== userId) {
      return res.status(403).json({ message: "Không có quyền" });
    }

    const shipment = await ShippingShipment.findOne({ orderId: order._id });
    if (!shipment || !shipment.trackingNumber) {
      return res.status(400).json({ message: "Đơn hàng chưa có vận đơn" });
    }

    if (shipment.status === "cancelled") {
      return res.status(200).json({ message: "Vận đơn đã hủy trước đó" });
    }

    // Gọi GHTK hủy
    const client = await createGhtkClientAsync();
    await client.cancelOrder(shipment.trackingNumber);

    // Cập nhật DB
    await ShippingShipment.findByIdAndUpdate(shipment._id, {
      status: "cancelled",
      statusUpdatedAt: new Date(),
      lastSyncedAt: new Date(),
      lastSyncedFrom: "platform_cancel",
    });

    await Order.findByIdAndUpdate(order._id, {
      status: "cancelled",
      shippingStatus: "cancelled",
    });

    console.log(`✅ ${TAG} Shipment cancelled: ${shipment.trackingNumber}`);

    return res.status(200).json({ message: "Hủy vận đơn thành công" });
  } catch (error: any) {
    console.error(`❌ ${TAG} cancelShipment error:`, error.message);
    if (error instanceof GhtkApiError) {
      return res.status(400).json({
        message: formatGhtkErrorMessage(error.code, error.message),
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════
// GET /shipping/status/:orderId — Tra cứu trạng thái
// ════════════════════════════════════════════════════════════════════════

export const getShipmentStatus = async (req: AuthedRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const shipment = await ShippingShipment.findOne({ orderId });
    if (!shipment) {
      return res.status(404).json({ message: "Không tìm thấy vận đơn" });
    }

    let ghtkStatus = null;
    if (shipment.trackingNumber) {
      try {
        const client = await createGhtkClientAsync();
        ghtkStatus = await client.getOrderStatus(shipment.trackingNumber);
      } catch {
        // Fallback to local data
      }
    }

    return res.status(200).json({
      shipment: {
        id: shipment._id,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        status: shipment.status,
        shippingFee: shipment.shippingFee,
        statusUpdatedAt: shipment.statusUpdatedAt,
      },
      ghtkStatus,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════
// POST /shipping/webhook/ghtk — Nhận webhook từ GHTK
// ════════════════════════════════════════════════════════════════════════

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.ip;

    console.log(`\n📥 ${TAG} WEBHOOK RECEIVED`, {
      ip: ipAddress,
      label_id: payload.label_id,
      status_id: payload.status_id,
      action_time: payload.action_time,
    });

    // 1. Tìm shipment
    const shipment = await ShippingShipment.findOne({
      trackingNumber: payload.label_id,
    });

    if (!shipment) {
      console.warn(`${TAG} Shipment not found: ${payload.label_id}`);
      // Vẫn log lại để trace
      await ShippingWebhookLog.create({
        rawPayload: JSON.stringify(payload),
        ipAddress: typeof ipAddress === "string" ? ipAddress : String(ipAddress),
        processed: false,
        processingError: "Shipment not found",
      });
      return res.status(200).json({ success: false });
    }

    // 2. Tạo webhook log
    const webhookLog = await ShippingWebhookLog.create({
      rawPayload: JSON.stringify(payload),
      shipmentId: shipment._id,
      ipAddress: typeof ipAddress === "string" ? ipAddress : String(ipAddress),
      processed: false,
    });

    try {
      const statusId = parseInt(payload.status_id);
      const shippingStatus = mapGhtkStatusToShippingStatus(statusId);
      const orderStatus = mapShippingStatusToOrderStatus(shippingStatus);
      const statusMessage = getGhtkStatusMessage(statusId);

      console.log(`${TAG} Status mapped:`, {
        ghtkStatusId: statusId,
        shippingStatus,
        orderStatus,
        statusMessage,
      });

      // 3. Parse action_time
      let actionTime: Date;
      try {
        const normalizedTime = (payload.action_time || "").replace(" ", "+");
        actionTime = new Date(normalizedTime);
        if (isNaN(actionTime.getTime())) actionTime = new Date();
      } catch {
        actionTime = new Date();
      }

      // 4. Cập nhật shipment
      await ShippingShipment.findByIdAndUpdate(shipment._id, {
        status: shippingStatus,
        statusUpdatedAt: actionTime,
        weight: payload.weight ? parseFloat(payload.weight) : undefined,
        shippingFee: payload.fee ? parseFloat(payload.fee) : undefined,
        codAmount: payload.pick_money ? parseFloat(payload.pick_money) : undefined,
        lastSyncedAt: new Date(),
        lastSyncedFrom: "webhook",
        metadata: JSON.stringify({
          statusId: payload.status_id,
          weight: payload.weight,
          fee: payload.fee,
          pickMoney: payload.pick_money,
          actionTime: payload.action_time,
        }),
      });

      // 5. Cập nhật order
      const updateData: Record<string, any> = {
        shippingStatus,
      };

      // Map sang order status (pending|shipping|delivered|cancelled)
      if (orderStatus !== "pending") {
        updateData.status = orderStatus;
      }

      // Auto-complete khi GHTK xác nhận giao thành công
      if (isGhtkOrderDelivered(statusId)) {
        updateData.status = "delivered";
      }

      await Order.findByIdAndUpdate(shipment.orderId, updateData);

      console.log(`✅ ${TAG} Order ${shipment.orderId} updated:`, updateData);

      // 6. Gửi notification
      try {
        const order = await Order.findById(shipment.orderId);
        if (order) {
          await notifyOrderStatusUpdated(
            order.userId.toString(),
            order._id.toString(),
            order.orderCode,
            statusMessage,
          );
        }
      } catch (notifErr) {
        console.error(`${TAG} Notification error:`, notifErr);
      }

      // 7. Đánh dấu webhook đã xử lý
      await ShippingWebhookLog.findByIdAndUpdate(webhookLog._id, {
        processed: true,
        processedAt: new Date(),
      });

      console.log(`✅ ${TAG} Webhook processed: ${webhookLog._id}`);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      // Lưu lỗi xử lý
      await ShippingWebhookLog.findByIdAndUpdate(webhookLog._id, {
        processingError: error.message,
        processed: false,
      });

      console.error(`❌ ${TAG} Webhook processing error:`, error.message);
      // Vẫn trả 200 để GHTK không retry liên tục
      return res.status(200).json({ success: false });
    }
  } catch (error: any) {
    console.error(`❌ ${TAG} Webhook unhandled error:`, error.message);
    return res.status(200).json({ success: false });
  }
};

// ════════════════════════════════════════════════════════════════════════
// GET /shipping/config — Lấy cấu hình GHTK (admin)
// ════════════════════════════════════════════════════════════════════════

export const getShippingConfig = async (req: AuthedRequest, res: Response) => {
  try {
    const ShippingConfigModel = (await import("../model/shippingConfigModel")).default;
    let doc = await ShippingConfigModel.findOne({ key: "ghtk" }).lean();

    if (!doc) {
      // Trả config từ env nếu DB chưa có
      const envToken = process.env.GHTK_API_TOKEN || "";
      const envShop = process.env.GHTK_SHOP_CODE || "";
      const envApi = process.env.GHTK_API_URL || "https://services.giaohangtietkiem.vn";
      const envWeb = process.env.GHTK_CUSTOMER_WEBSITE || "https://khachhang-staging.ghtklab.com";

      return res.status(200).json({
        config: {
          apiToken: envToken ? "••••" + envToken.slice(-6) : "",
          shopCode: envShop,
          apiUrl: envApi,
          customerWebsite: envWeb,
          isActive: !!(envToken && envShop && envApi),
          source: "env",
        },
      });
    }

    return res.status(200).json({
      config: {
        // Không trả full token — chỉ hiện 6 ký tự cuối
        apiToken: doc.apiToken ? "••••" + doc.apiToken.slice(-6) : "",
        shopCode: doc.shopCode || "",
        apiUrl: doc.apiUrl || "",
        customerWebsite: doc.customerWebsite || "",
        isActive: doc.isActive,
        source: "database",
        updatedAt: (doc as any).updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════
// PUT /shipping/config — Cập nhật cấu hình GHTK (admin)
// ════════════════════════════════════════════════════════════════════════

export const updateShippingConfig = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });

    const { apiToken, shopCode, apiUrl, customerWebsite, isActive } = req.body;

    // Validate bắt buộc
    if (apiToken !== undefined && typeof apiToken !== "string") {
      return res.status(400).json({ message: "apiToken phải là chuỗi" });
    }
    if (shopCode !== undefined && typeof shopCode !== "string") {
      return res.status(400).json({ message: "shopCode phải là chuỗi" });
    }

    const ShippingConfigModel = (await import("../model/shippingConfigModel")).default;

    const updateData: Record<string, any> = {
      updatedBy: userId,
    };

    // Chỉ cập nhật token nếu gửi giá trị thật (không phải masked "••••")
    if (apiToken && !apiToken.startsWith("••••")) {
      updateData.apiToken = apiToken.trim();
    }
    if (shopCode !== undefined) updateData.shopCode = shopCode.trim();
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl.trim().replace(/\/$/, "");
    if (customerWebsite !== undefined) updateData.customerWebsite = customerWebsite.trim().replace(/\/$/, "");
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const doc = await ShippingConfigModel.findOneAndUpdate(
      { key: "ghtk" },
      { $set: updateData },
      { upsert: true, new: true },
    );

    // Xóa cache để lần gọi tiếp theo đọc config mới
    invalidateGhtkConfigCache();

    console.log(`✅ ${TAG} Config updated by ${userId}`);

    return res.status(200).json({
      message: "Cập nhật cấu hình GHTK thành công",
      config: {
        apiToken: doc.apiToken ? "••••" + doc.apiToken.slice(-6) : "",
        shopCode: doc.shopCode,
        apiUrl: doc.apiUrl,
        customerWebsite: doc.customerWebsite,
        isActive: doc.isActive,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
