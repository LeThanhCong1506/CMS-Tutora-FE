/**
 * Đọc ô lọc theo id (mã đặt lịch, id buổi học) thành số để gửi lên BE.
 *
 * Trả undefined nghĩa là "không lọc". Ô trống, số 0, số âm hay chữ đều rơi vào đây
 * thay vì gửi lên rồi nhận 400 — id trong DB luôn là số nguyên dương.
 *
 * Dùng chung cho mọi trang có ô lọc theo id, để hai trang không diễn giải cùng
 * một chuỗi theo hai cách khác nhau.
 */
export function parseIdFilter(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Number() nhận cả '12.5' và '1e3'; chỉ chấp nhận chuỗi toàn chữ số.
    if (!/^\d+$/.test(trimmed)) return undefined;

    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
