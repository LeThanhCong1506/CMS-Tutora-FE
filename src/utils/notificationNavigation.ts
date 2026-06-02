import type { NotificationDTO } from '../services/notification.service';

/**
 * Trả về portal prefix cho URL. Repo gốc map theo pathname (admin/tutor/parent/
 * student); admin repo chỉ có 1 portal nên trả thẳng `/admin-portal`.
 */
export function getPortalPrefix(): string {
    return '/admin-portal';
}

/**
 * Admin-only notification routing.
 *
 * Repo gốc (Agora-Frontend) có hàm này map notification sang nhiều portal
 * (admin / tutor / parent / student) với deep-link đến lesson, booking, message.
 * Ở admin repo, các route lesson/message không tồn tại — đơn giản hoá thành:
 *   - Booking-related notification → /admin-portal/bookings/:refId nếu có refId
 *   - Còn lại → /admin-portal/notifications
 *
 * Khi admin cần deep-link sang vetting/warning/payout trong tương lai, mở rộng
 * mapping ở Layer 1.
 */
export function getNotificationTargetPath(notification: NotificationDTO): string {
    const prefix = '/admin-portal';
    const type = notification.type ?? '';
    const refId = notification.referenceid ?? '';
    const combined = ((notification.title ?? '') + ' ' + (notification.message ?? '')).toLowerCase();

    // ── Booking deep-link (type-based) ──
    if (
        (type === 'booking_new' || type === 'booking_accepted' || type === 'booking_declined') &&
        refId
    ) {
        return `${prefix}/bookings/${refId}`;
    }

    // ── Keyword fallback ──
    if (combined.includes('booking') || combined.includes('đặt lịch') || combined.includes('cọc')) {
        return refId ? `${prefix}/bookings/${refId}` : `${prefix}/bookings`;
    }

    // ── Default ──
    return `${prefix}/notifications`;
}
