/** Địa chỉ hành chính mới (2 cấp): tỉnh/TP + xã/phường để làm điểm xuất hàng. */
export type ShopOriginCoords = { province: string; ward: string };

type AddrRow = {
    type?: string;
    isDefault?: boolean;
    province?: string;
    district?: string;
    ward?: string;
};

/** Điểm xuất hàng cho admin: ưu tiên warehouse (legacy), rồi default, rồi địa chỉ đầu tiên. */
export function pickShopOriginAddress(addresses: unknown[] | undefined): ShopOriginCoords | null {
    const list = (addresses ?? []) as AddrRow[];
    if (list.length === 0) return null;

    const wh = list.find((a) => a.type === "warehouse");
    if (wh?.province?.trim() && wh?.ward?.trim()) {
        return { province: wh.province.trim(), ward: wh.ward.trim() };
    }
    const def = list.find((a) => a.isDefault);
    if (def?.province?.trim() && def?.ward?.trim()) {
        return { province: def.province.trim(), ward: def.ward.trim() };
    }
    const first = list[0];
    if (first?.province?.trim() && first?.ward?.trim()) {
        return { province: first.province.trim(), ward: first.ward.trim() };
    }
    return null;
}
