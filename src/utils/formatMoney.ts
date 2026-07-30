/**
 * Định dạng tiền cho bộ báo cáo doanh thu.
 *
 *   - Phân cách nghìn bằng dấu PHẨY: 432,500 VND
 *   - LUÔN hiện số đầy đủ, không rút gọn thành 432.5K / 1.2M — báo
 *     cáo tài chính cần con số chính xác để đối chiếu, không phải con số gần đúng.
 */

/** 432500 → "432,500" */
export const money = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
};

/** 432500 → "432,500 VND" */
export const moneyVnd = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
    return `${money(amount)} VND`;
};

export const count = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
};

/** Chênh lệch % giữa kỳ này và kỳ trước, kèm mũi tên. */
export const growthBadge = (current: number, previous: number): string | undefined => {
    if (!previous) return undefined;
    const g = ((current - previous) / previous) * 100;
    return `${g >= 0 ? '▲' : '▼'} ${Math.abs(g).toFixed(1)}%`;
};
