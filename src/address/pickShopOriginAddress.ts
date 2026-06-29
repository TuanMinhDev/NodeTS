/**
 * Chọn địa chỉ xuất hàng (pickup) cho seller/admin.
 *
 * Ưu tiên: warehouse → default → địa chỉ đầu tiên.
 * Trả đầy đủ thông tin cho GHTK: fullName, phoneNumber, address(street),
 * province, district, ward.
 */

export interface ShopOriginAddress {
  fullName: string;
  phoneNumber: string;
  address: string;     // street / số nhà
  province: string;
  district: string;
  ward: string;
}

type AddrRow = {
  type?: string;
  isDefault?: boolean;
  fullName?: string;
  phoneNumber?: string;
  province?: string;
  district?: string;
  ward?: string;
  street?: string;
};

function toOrigin(a: AddrRow): ShopOriginAddress | null {
  const province = a.province?.trim();
  const ward = a.ward?.trim();
  if (!province || !ward) return null;

  return {
    fullName: a.fullName?.trim() || "Shop",
    phoneNumber: a.phoneNumber?.trim() || "",
    address: a.street?.trim() || "",
    province,
    district: a.district?.trim() || ward, // fallback district = ward nếu không có
    ward,
  };
}

/** Điểm xuất hàng cho admin: ưu tiên warehouse → default → đầu tiên. */
export function pickShopOriginAddress(
  addresses: unknown[] | undefined,
): ShopOriginAddress | null {
  const list = (addresses ?? []) as AddrRow[];
  if (list.length === 0) return null;

  // 1. warehouse
  const wh = list.find((a) => a.type === "warehouse");
  if (wh) {
    const origin = toOrigin(wh);
    if (origin) return origin;
  }

  // 2. default
  const def = list.find((a) => a.isDefault);
  if (def) {
    const origin = toOrigin(def);
    if (origin) return origin;
  }

  // 3. first
  return toOrigin(list[0]);
}
