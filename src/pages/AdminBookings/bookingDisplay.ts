import type { StatusVariant } from '../../components/shared';

/**
 * Mapping booking status từ BE (lowercase snake_case) → label tiếng Việt + màu badge.
 * Match với value backend BookingStatus.cs constants.
 */
export const BOOKING_STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
    pending_tutor: { label: 'Chờ gia sư xác nhận', variant: 'warning' },
    pending_payment: { label: 'Chờ thanh toán', variant: 'warning' },
    pending_remaining_payment: { label: 'Chờ thanh toán còn lại', variant: 'warning' },
    accepted: { label: 'Đã chấp nhận', variant: 'info' },
    confirmed: { label: 'Đã xác nhận', variant: 'info' },
    active: { label: 'Đang học', variant: 'success' },
    completed: { label: 'Đã hoàn thành', variant: 'success' },
    cancelled: { label: 'Đã hủy', variant: 'error' },
    declined: { label: 'Đã từ chối', variant: 'error' },
};

export function getBookingStatusDisplay(status?: string): { label: string; variant: StatusVariant } {
    if (!status) return { label: 'Không xác định', variant: 'neutral' };
    return (
        BOOKING_STATUS_MAP[status.toLowerCase()] ?? {
            label: status,
            variant: 'neutral',
        }
    );
}

/** Payment status — match PaymentStatus.cs (Pending / Paid / Failed / Refunded). */
export const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
    pending: { label: 'Chờ thanh toán', variant: 'warning' },
    paid: { label: 'Đã thanh toán', variant: 'success' },
    failed: { label: 'Thất bại', variant: 'error' },
    refunded: { label: 'Đã hoàn tiền', variant: 'info' },
};

export function getPaymentStatusDisplay(status?: string): { label: string; variant: StatusVariant } {
    if (!status) return { label: '—', variant: 'neutral' };
    return (
        PAYMENT_STATUS_MAP[status.toLowerCase()] ?? {
            label: status,
            variant: 'neutral',
        }
    );
}

/** Teaching mode mapping. */
export function getTeachingModeLabel(mode?: string): string {
    if (!mode) return '—';
    switch (mode.toLowerCase()) {
        case 'online':
            return 'Trực tuyến';
        case 'offline':
            return 'Tại nhà';
        case 'hybrid':
            return 'Linh hoạt';
        default:
            return mode;
    }
}

/** Status options cho dropdown filter — chỉ những status admin cần lọc. */
export const BOOKING_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending_tutor', label: 'Chờ gia sư xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'active', label: 'Đang học' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
];

/** Format VND currency. */
export function formatVND(amount?: number): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// ───── Lesson status — match LessonStatus.cs constants ──────────────────────
export const LESSON_STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
    scheduled: { label: 'Đã lên lịch', variant: 'info' },
    in_progress: { label: 'Đang diễn ra', variant: 'warning' },
    completed: { label: 'Hoàn thành', variant: 'success' },
    pending_confirmation: { label: 'Chờ xác nhận', variant: 'warning' },
    pending_parent_confirmation: { label: 'Chờ phụ huynh xác nhận', variant: 'warning' },
    cancelled: { label: 'Đã hủy', variant: 'error' },
    no_show: { label: 'Vắng mặt', variant: 'error' },
    disputed: { label: 'Đang khiếu nại', variant: 'error' },
    checked_in: { label: 'Đã check-in', variant: 'info' },
};

export function getLessonStatusDisplay(status?: string): { label: string; variant: StatusVariant } {
    if (!status) return { label: '—', variant: 'neutral' };
    return LESSON_STATUS_MAP[status.toLowerCase()] ?? { label: status, variant: 'neutral' };
}

// ───── Escrow status ────────────────────────────────────────────────────────
export const ESCROW_STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
    held: { label: 'Đang giữ', variant: 'warning' },
    released: { label: 'Đã giải ngân', variant: 'success' },
    refunded: { label: 'Đã hoàn', variant: 'info' },
    disputed: { label: 'Tranh chấp', variant: 'error' },
};

export function getEscrowStatusDisplay(status?: string): { label: string; variant: StatusVariant } {
    if (!status) return { label: '—', variant: 'neutral' };
    return ESCROW_STATUS_MAP[status.toLowerCase()] ?? { label: status, variant: 'neutral' };
}

// ───── Refund status ────────────────────────────────────────────────────────
export const REFUND_STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
    none: { label: 'Không có', variant: 'neutral' },
    pending: { label: 'Chờ hoàn', variant: 'warning' },
    processed: { label: 'Đã hoàn', variant: 'success' },
    failed: { label: 'Hoàn thất bại', variant: 'error' },
};

export function getRefundStatusDisplay(status?: string): { label: string; variant: StatusVariant } {
    if (!status) return { label: '—', variant: 'neutral' };
    return REFUND_STATUS_MAP[status.toLowerCase()] ?? { label: status, variant: 'neutral' };
}
