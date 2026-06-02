/**
 * Shared payment-badge resolver used by booking list / detail pages
 * (StudentBooking, ParentBooking/Details, …).
 *
 * Centralises two rules that several pages got wrong:
 *
 *   1. Hide the payment badge entirely for "dead" bookings (cancelled /
 *      rejected / payment_timeout). The booking has terminated, so its
 *      payment state is irrelevant noise — showing "Pending" next to a
 *      cancelled booking is what BUG-010 reported.
 *
 *   2. Never render a raw English BE value in the UI. A page that maps
 *      only "Paid" and "DepositPaid" and lets everything else fall through
 *      will leak "Pending", "Refunded", etc. to the screen. We map every
 *      status we know about, and return null for unknown values so callers
 *      hide the badge rather than printing the raw string.
 */

export type PaymentBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface PaymentBadgeDisplay {
    /** Vietnamese label shown to users */
    label: string;
    /** Semantic tone — callers map this to their own colors / icons */
    tone: PaymentBadgeTone;
}

/**
 * Booking statuses where the payment badge should be hidden.
 * These are terminal states — no further payment will ever happen.
 */
const TERMINAL_BOOKING_STATUSES = new Set([
    'cancelled',
    'rejected',
    'payment_timeout',
]);

/**
 * Map of every payment status BE may return to its Vietnamese label + tone.
 * Keys are case-sensitive — match the exact BE value (PascalCase).
 */
const PAYMENT_STATUS_MAP: Record<string, PaymentBadgeDisplay> = {
    // Terminal-success: money has fully landed in escrow / been disbursed.
    Paid: { label: 'Đã thanh toán', tone: 'success' },
    Escrowed: { label: 'Đã thanh toán', tone: 'success' },

    // Half-paid: deposit done, remainder still owed.
    DepositPaid: { label: 'Đã cọc', tone: 'success' },
    DepositEscrowed: { label: 'Đã cọc', tone: 'success' },

    // Awaiting action.
    Pending: { label: 'Chờ thanh toán', tone: 'warning' },
    PendingRemaining: { label: 'Chờ thanh toán nốt', tone: 'warning' },

    // Resolved-but-not-positive.
    Refunded: { label: 'Đã hoàn tiền', tone: 'neutral' },
    Failed: { label: 'Thanh toán thất bại', tone: 'danger' },
};

/**
 * Resolve a booking's payment state into a badge to render, or null when
 * no badge should be shown.
 *
 * @param bookingStatus  Top-level booking status (lowercase snake_case from BE)
 * @param paymentStatus  Payment status (PascalCase from BE)
 * @returns Display info, or `null` if the badge must be hidden
 */
export function getPaymentBadge(
    bookingStatus: string | null | undefined,
    paymentStatus: string | null | undefined,
): PaymentBadgeDisplay | null {
    // Empty / nullish payment status → nothing to show.
    if (!paymentStatus) return null;

    // Booking is dead — payment is moot.
    if (bookingStatus && TERMINAL_BOOKING_STATUSES.has(bookingStatus)) return null;

    // Unknown status → hide rather than leaking raw BE strings to UX.
    return PAYMENT_STATUS_MAP[paymentStatus] ?? null;
}
