/**
 * GHTK (Giao Hàng Tiết Kiệm) — Core Library
 *
 * Types, API Client, Status mapping, Helpers
 * Adapted from ssp_ecommerce staging
 */

import dotenv from "dotenv";
dotenv.config();

// ════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ════════════════════════════════════════════════════════════════════════

export interface GhtkProduct {
  name: string;
  price?: number;
  weight: number; // kg
  quantity?: number;
  product_code?: string;
  height?: number; // cm
  width?: number; // cm
  length?: number; // cm
}

export interface GhtkOrderData {
  id: string; // Mã đơn hàng đối tác
  pick_name: string;
  pick_money: number;
  pick_address_id?: string;
  pick_address: string;
  pick_province: string;
  pick_district?: string;
  pick_ward?: string;
  pick_street?: string;
  pick_tel: string;
  pick_option?: string;
  name: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  street?: string;
  hamlet?: string;
  tel: string;
  note?: string;
  email?: string;
  return_name: string;
  return_address: string;
  return_province: string;
  return_district?: string;
  return_tel: string;
  is_freeship?: number;
  value: number; // Giá trị khai giá
  transport?: string;
  total_weight?: number;
  tags?: Array<{ id: number }>;
}

export interface GhtkCreateOrderRequest {
  products: GhtkProduct[];
  order: GhtkOrderData;
}

// ════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ════════════════════════════════════════════════════════════════════════

export interface GhtkOrderResponse {
  partner_id: string;
  label: string;
  area: string;
  fee: number;
  insurance_fee: number;
  tracking_id: number;
  estimated_pick_time: string;
  estimated_deliver_time: string;
  products: any[];
  status_id: number;
}

export interface GhtkApiResponse<T = any> {
  success: boolean;
  message: string;
  log_id?: string;
  data?: T;
  error_code?: string;
  order?: T;
}

export interface GhtkOrderStatusResponse {
  label_id: string;
  partner_id: string;
  status: string;
  status_text: string;
  created: string;
  modified: string;
  message: string;
  pick_date: string;
  deliver_date: string;
  customer_fullname: string;
  customer_tel: string;
  address: string;
  storage_day: number;
  ship_money: number;
  insurance: number;
  value: number;
  weight: number; // gram
  pick_money: number;
  is_freeship: number;
}

export interface GhtkShippingFeeResponse {
  name: string;
  fee: number;
  insurance_fee: number;
  include_vat?: number;
  delivery_type: string;
  delivery: boolean;
  ship_fee_only?: number;
  extFees?: Array<{
    display?: string;
    title: string;
    amount: number;
    type: string;
  }>;
  options?: {
    name?: string;
    title?: string;
    shipMoney?: number;
    shipMoneyText?: string;
  };
}

// ════════════════════════════════════════════════════════════════════════
// WEBHOOK TYPES
// ════════════════════════════════════════════════════════════════════════

export interface GhtkWebhookPayload {
  partner_id: string;
  label_id: string;
  status_id: number;
  action_time: string;
  reason_code: string;
  reason: string;
  weight: number;
  fee: number;
  pick_money: number;
  return_part_package: number;
}

// ════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ════════════════════════════════════════════════════════════════════════

export class GhtkApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public logId?: string,
    public httpStatus?: number,
  ) {
    super(message);
    this.name = "GhtkApiError";
  }
}

// ════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════

export interface GhtkConfig {
  apiToken: string;
  shopCode: string;
  apiUrl: string;
}

import ShippingConfig from "./model/shippingConfigModel";

/** Cache config trong memory — refresh mỗi 60s hoặc khi cập nhật */
let _configCache: { config: GhtkConfig; ts: number } | null = null;
const CONFIG_TTL_MS = 60_000;

/** Đọc config GHTK từ DB (async) → fallback env */
export async function getGhtkConfigFromDb(): Promise<GhtkConfig> {
  // Check cache
  if (_configCache && Date.now() - _configCache.ts < CONFIG_TTL_MS) {
    return _configCache.config;
  }

  try {
    const doc = await ShippingConfig.findOne({ key: "ghtk", isActive: true }).lean();
    if (doc && doc.apiToken && doc.shopCode && doc.apiUrl) {
      const config: GhtkConfig = {
        apiToken: doc.apiToken,
        shopCode: doc.shopCode,
        apiUrl: doc.apiUrl.replace(/\/$/, ""),
      };
      _configCache = { config, ts: Date.now() };
      return config;
    }
  } catch (err) {
    console.warn("[GHTK] Could not read config from DB, falling back to env:", err);
  }

  // Fallback to env
  return getGhtkConfigFromEnv();
}

/** Đọc config GHTK từ environment (sync) */
export function getGhtkConfigFromEnv(): GhtkConfig {
  const apiToken = process.env.GHTK_API_TOKEN;
  const shopCode = process.env.GHTK_SHOP_CODE;
  const apiUrl = process.env.GHTK_API_URL;

  if (!apiToken || !shopCode || !apiUrl) {
    throw new Error(
      "GHTK chưa được cấu hình. Vào Admin → Cài đặt GHTK để nhập API Token và Shop Code, hoặc thiết lập GHTK_API_TOKEN, GHTK_SHOP_CODE, GHTK_API_URL trong .env",
    );
  }

  return { apiToken, shopCode, apiUrl: apiUrl.replace(/\/$/, "") };
}

/** Sync getter (dùng env — tương thích cũ) */
export function getGhtkConfig(): GhtkConfig {
  // Nếu có cache từ DB → dùng cache
  if (_configCache && Date.now() - _configCache.ts < CONFIG_TTL_MS) {
    return _configCache.config;
  }
  return getGhtkConfigFromEnv();
}

/** Xóa cache khi admin cập nhật config */
export function invalidateGhtkConfigCache(): void {
  _configCache = null;
}

/** URL web khách hàng GHTK */
export async function getGhtkCustomerWebsiteAsync(): Promise<string> {
  try {
    const doc = await ShippingConfig.findOne({ key: "ghtk" }).lean();
    if (doc?.customerWebsite?.trim()) {
      return doc.customerWebsite.trim().replace(/\/$/, "");
    }
  } catch {}
  const url = process.env.GHTK_CUSTOMER_WEBSITE?.trim();
  if (!url) return "https://khachhang-staging.ghtklab.com";
  return url.replace(/\/$/, "");
}

/** URL web khách hàng GHTK (sync — dùng env) */
export function getGhtkCustomerWebsite(): string {
  const url = process.env.GHTK_CUSTOMER_WEBSITE?.trim();
  if (!url) return "https://khachhang-staging.ghtklab.com";
  return url.replace(/\/$/, "");
}

/** Xây dựng URL tracking */
export function buildGhtkTrackingUrl(label: string): string {
  return `${getGhtkCustomerWebsite()}/tracking/${encodeURIComponent(label)}`;
}

// ════════════════════════════════════════════════════════════════════════
// GHTK API CLIENT
// ════════════════════════════════════════════════════════════════════════

export class GhtkClient {
  private apiToken: string;
  private shopCode: string;
  private apiUrl: string;

  constructor(config: GhtkConfig) {
    this.apiToken = config.apiToken;
    this.shopCode = config.shopCode;
    this.apiUrl = config.apiUrl;
  }

  private getHeaders(): Record<string, string> {
    return {
      Token: this.apiToken,
      "X-Client-Source": this.shopCode,
      "Content-Type": "application/json",
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new GhtkApiError("PARSE_ERROR", "Failed to parse GHTK API response");
    }

    if (!response.ok) {
      throw new GhtkApiError(
        data.error_code || "UNKNOWN_ERROR",
        data.message || "Unknown error",
        data.log_id,
        response.status,
      );
    }

    if (data.success === false) {
      throw new GhtkApiError(
        data.error_code || "API_ERROR",
        data.message || "API returned error",
        data.log_id,
        200,
      );
    }

    return data;
  }

  /** POST /services/shipment/order — Tạo đơn hàng GHTK */
  async createOrder(request: GhtkCreateOrderRequest): Promise<GhtkOrderResponse> {
    try {
      const url = `${this.apiUrl}/services/shipment/order`;
      console.log(`📤 [GHTK] POST ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      const data = await this.handleResponse<GhtkApiResponse>(response);
      if (!data.order) {
        throw new GhtkApiError("MISSING_ORDER", "GHTK response missing order data");
      }

      console.log(`✅ [GHTK] createOrder success — label: ${(data.order as any)?.label}`);
      return data.order as GhtkOrderResponse;
    } catch (error) {
      if (error instanceof GhtkApiError) throw error;
      throw new GhtkApiError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error",
      );
    }
  }

  /** GET /services/shipment/v2/:tracking — Trạng thái đơn hàng */
  async getOrderStatus(trackingOrder: string): Promise<GhtkOrderStatusResponse> {
    try {
      const response = await fetch(
        `${this.apiUrl}/services/shipment/v2/${encodeURIComponent(trackingOrder)}`,
        { method: "GET", headers: this.getHeaders() },
      );

      const data = await this.handleResponse<GhtkApiResponse>(response);
      return data.order as GhtkOrderStatusResponse;
    } catch (error) {
      if (error instanceof GhtkApiError) throw error;
      throw new GhtkApiError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error",
      );
    }
  }

  /** GET /services/shipment/fee — Tính phí vận chuyển */
  async calculateShippingFee(params: {
    pick_province: string;
    pick_district?: string;
    pick_ward?: string;
    province: string;
    district?: string;
    ward?: string;
    weight: number; // gram
    value?: number;
    transport?: string;
  }): Promise<GhtkShippingFeeResponse> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.set(key, String(value));
        }
      });

      const url = `${this.apiUrl}/services/shipment/fee?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new GhtkApiError(
          data.error_code || "API_ERROR",
          data.message || "API returned error",
          data.log_id,
          response.status,
        );
      }

      const feeData = data.data?.fee || data.fee || data.data || data;
      return feeData as GhtkShippingFeeResponse;
    } catch (error) {
      if (error instanceof GhtkApiError) throw error;
      throw new GhtkApiError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error",
      );
    }
  }

  /** POST /services/shipment/cancel/:tracking — Hủy đơn hàng */
  async cancelOrder(trackingOrder: string): Promise<{ log_id: string }> {
    try {
      const response = await fetch(
        `${this.apiUrl}/services/shipment/cancel/${encodeURIComponent(trackingOrder)}`,
        { method: "POST", headers: this.getHeaders() },
      );

      const data = await this.handleResponse<GhtkApiResponse>(response);
      return { log_id: data.log_id || "" };
    } catch (error) {
      if (error instanceof GhtkApiError) throw error;
      throw new GhtkApiError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error",
      );
    }
  }
}

/** Factory function (sync — env / cache) */
export function createGhtkClient(config?: GhtkConfig): GhtkClient {
  return new GhtkClient(config || getGhtkConfig());
}

/** Factory function (async — DB first) */
export async function createGhtkClientAsync(): Promise<GhtkClient> {
  const config = await getGhtkConfigFromDb();
  return new GhtkClient(config);
}

// ════════════════════════════════════════════════════════════════════════
// STATUS MAPPING
// ════════════════════════════════════════════════════════════════════════

/** Mã trạng thái GHTK → nhãn tiếng Việt */
const GHTK_STATUS_MESSAGES: Record<number, string> = {
  [-1]: "Đơn hàng đã bị hủy",
  1: "Đơn hàng vừa được tạo",
  2: "GHTK đã tiếp nhận đơn",
  3: "Shipper đã lấy hàng",
  4: "Đang giao khách",
  5: "Giao thành công",
  6: "Đã đối soát",
  7: "Không lấy được hàng",
  8: "Hoãn lấy hàng",
  9: "Không giao được hàng",
  10: "Delay giao hàng",
  11: "Đã đối soát công nợ trả hàng",
  12: "Shipper đang đi lấy hàng",
  13: "Đơn hàng bồi hoàn",
  20: "Đang trả hàng",
  21: "Đã trả hàng",
  123: "Shipper báo đã lấy hàng",
  127: "Shipper báo không lấy được hàng",
  128: "Shipper báo delay lấy hàng",
  45: "Shipper báo đã giao hàng",
  49: "Shipper báo không giao được hàng",
  410: "Shipper báo delay giao hàng",
};

export function getGhtkStatusMessage(statusCode: number): string {
  return GHTK_STATUS_MESSAGES[statusCode] || `Trạng thái ${statusCode}`;
}

/**
 * Map GHTK status code → internal shipping status
 *
 * pending      : 1, 2, 12
 * in_transit   : 3, 4, 123, 410
 * delivered    : 5, 6, 45
 * cancelled    : -1
 * cannot_pickup: 7, 127
 * cannot_deliver: 9, 49
 * delay_pickup : 8, 128
 * delay_delivery: 10
 * returning    : 20
 * returned     : 21
 * refunded     : 13
 * reconciled_return: 11
 */
export function mapGhtkStatusToShippingStatus(ghtkStatus: number): string {
  const map: Record<number, string> = {
    [-1]: "cancelled",
    1: "pending",
    2: "pending",
    3: "in_transit",
    4: "in_transit",
    5: "delivered",
    6: "delivered",
    7: "cannot_pickup",
    8: "delay_pickup",
    9: "cannot_deliver",
    10: "delay_delivery",
    11: "reconciled_return",
    12: "pending",
    13: "refunded",
    20: "returning",
    21: "returned",
    123: "in_transit",
    127: "cannot_pickup",
    128: "delay_pickup",
    45: "delivered",
    49: "cannot_deliver",
    410: "in_transit",
  };

  return map[ghtkStatus] || "pending";
}

/**
 * Map internal shipping status → unified Order.status (pending | shipping | delivered | cancelled)
 * Giữ tương thích với Order model hiện tại
 */
export function mapShippingStatusToOrderStatus(shippingStatus: string): string {
  const map: Record<string, string> = {
    pending: "pending",
    in_transit: "shipping",
    delay_pickup: "pending",
    delay_delivery: "shipping",
    delivered: "delivered",
    reconciled_return: "delivered",
    returning: "shipping",
    returned: "delivered",
    cannot_pickup: "cancelled",
    cannot_deliver: "cancelled",
    refunded: "cancelled",
    cancelled: "cancelled",
  };

  return map[shippingStatus] || "pending";
}

/** GHTK status → unified Order.status (convenience) */
export function mapGhtkStatusToOrderStatus(ghtkStatus: number): string {
  return mapShippingStatusToOrderStatus(mapGhtkStatusToShippingStatus(ghtkStatus));
}

/** Kiểm tra trạng thái cuối cùng */
export function isGhtkOrderFinal(ghtkStatus: number): boolean {
  return [-1, 5, 6, 7, 9, 11, 21].includes(ghtkStatus);
}

/** Kiểm tra giao thành công */
export function isGhtkOrderDelivered(ghtkStatus: number): boolean {
  return [5, 6].includes(ghtkStatus);
}

// ════════════════════════════════════════════════════════════════════════
// ERROR MESSAGE MAPPING
// ════════════════════════════════════════════════════════════════════════

const GHTK_ERROR_MESSAGES: Record<string, string> = {
  "30101": "Thiếu thông tin đơn hàng",
  "30102": "Mã đơn hàng quá dài (tối đa 250 ký tự)",
  "30103": "Đơn hàng chưa có khối lượng",
  "30107": "Mã đơn hàng đã được sử dụng",
  "30110": "Giá trị hàng hoá phải lớn hơn 0",
  "30201": "Số điện thoại lấy hàng không hợp lệ",
  "30301": "Số điện thoại khách hàng không hợp lệ",
  "30610": "Tuyến giao đến địa chỉ này đang tạm ngưng nhận đơn",
  "50101": "Đơn hàng đã ở trong thời hủy",
  "50102": "Đơn đã lấy hàng, không thể hủy",
  "50107": "Không thể hủy đơn hàng",
  "50109": "Không tìm thấy vận đơn trên hệ thống",
};

export function formatGhtkErrorMessage(errorCode: string, fallback: string): string {
  return GHTK_ERROR_MESSAGES[errorCode] || fallback;
}

// ════════════════════════════════════════════════════════════════════════
// WEBHOOK HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Parse webhook payload từ form-data (GHTK gửi application/x-www-form-urlencoded) */
export function parseWebhookPayload(formData: Record<string, any>): GhtkWebhookPayload {
  return {
    partner_id: String(formData.partner_id || ""),
    label_id: String(formData.label_id || ""),
    status_id: parseInt(formData.status_id || "0", 10),
    action_time: String(formData.action_time || ""),
    reason_code: String(formData.reason_code || ""),
    reason: String(formData.reason || ""),
    weight: parseFloat(formData.weight || "0"),
    fee: parseInt(formData.fee || "0", 10),
    pick_money: parseInt(formData.pick_money || "0", 10),
    return_part_package: parseInt(formData.return_part_package || "0", 10),
  };
}

/** Giá trị khai giá + COD cho đơn giao đi */
const GHTK_DECLARED_VALUE_MIN = 1;
const GHTK_DECLARED_VALUE_MAX = 20_000_000;

export function resolveGhtkOutboundAmounts(order: {
  shippingFee?: number;
  totalPrice: number;
}) {
  const totalPrice = Number(order.totalPrice);
  const shippingFee = Number(order.shippingFee ?? 0);
  const goodsValue = Math.max(GHTK_DECLARED_VALUE_MIN, totalPrice - shippingFee);
  const value = Math.min(goodsValue, GHTK_DECLARED_VALUE_MAX);

  return {
    pickMoney: totalPrice,
    isFreeship: 1 as const,
    value,
  };
}
