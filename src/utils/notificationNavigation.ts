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

    if (type === 'support_message') {
        return `${prefix}/support`;
    }

    // ── Yêu cầu rút tiền mới → thẳng trang duyệt payout (refId = withdrawalId) ──
    if (type === 'withdrawal_request_new') {
        return refId ? `${prefix}/payouts/${refId}` : `${prefix}/payouts`;
    }

    // ── Khiếu nại mới → trang xử lý khiếu nại. refId là disputeId (KHÔNG phải classSessionId):
    //    route CMS là `disputes/:id` với id = disputeId, khác app người dùng. ──
    if (type === 'dispute_new') {
        return refId ? `${prefix}/disputes/${refId}` : `${prefix}/disputes`;
    }

    // ── Booking deep-link (type-based) ──
    if (
        (type === 'booking_new' || type === 'booking_accepted' || type === 'booking_declined') &&
        refId
    ) {
        return `${prefix}/bookings/${refId}`;
    }

    // ── Tutor profile update deep-link (type-based) ──
    if (type === 'tutor_profile_update') {
        return `${prefix}/vetting/profiles?tab=updates`;
    }

    // ── Keyword fallback ──
    if (combined.includes('booking') || combined.includes('đặt lịch') || combined.includes('cọc')) {
        return refId ? `${prefix}/bookings/${refId}` : `${prefix}/bookings`;
    }
    if (combined.includes('cập nhật hồ sơ')) {
        return `${prefix}/vetting/profiles?tab=updates`;
    }
    if (combined.includes('tranh chấp') || combined.includes('khiếu nại')) {
        return refId ? `${prefix}/disputes/${refId}` : `${prefix}/disputes`;
    }
    if (combined.includes('rút tiền') || combined.includes('payout')) {
        return refId ? `${prefix}/payouts/${refId}` : `${prefix}/payouts`;
    }

    // ── Default ──
    return `${prefix}/notifications`;
}
