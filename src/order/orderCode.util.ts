import Order from "./model/orderModel";

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

/** DDMMYYYY theo giờ Việt Nam — ví dụ 27/05/2026 → 27052026 */
export function getOrderDatePrefix(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: VN_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).formatToParts(date);

    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";

    return `${day}${month}${year}`;
}

function parseSequenceFromOrderCode(orderCode: string, prefix: string): number | null {
    if (!orderCode.startsWith(prefix)) return null;
    const tail = orderCode.slice(prefix.length);
    if (!/^\d+$/.test(tail)) return null;
    const n = Number.parseInt(tail, 10);
    return Number.isNaN(n) ? null : n;
}

/** Sinh mã đơn: DDMMYYYY + số thứ tự trong ngày (270520261, 270520262, …). */
export async function generateOrderCode(date = new Date()): Promise<string> {
    const prefix = getOrderDatePrefix(date);

    const last = await Order.findOne({ orderCode: { $regex: `^${prefix}\\d+$` } })
        .sort({ orderCode: -1 })
        .select("orderCode")
        .lean();

    let seq = 1;
    if (last?.orderCode) {
        const prev = parseSequenceFromOrderCode(last.orderCode, prefix);
        if (prev !== null) seq = prev + 1;
    }

    return `${prefix}${seq}`;
}

export function isDuplicateOrderCodeError(error: unknown): boolean {
    return (
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error as { code?: number }).code === 11000
    );
}
