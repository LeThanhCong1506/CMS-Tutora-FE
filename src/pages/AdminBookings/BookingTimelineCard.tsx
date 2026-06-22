import type { BookingTimelineEvent } from '../../types/adminBooking.types';
import { StatusBadge } from '../../components/shared';
import { formatDateTime } from '../../utils/formatters';
import { getBookingStatusDisplay } from './bookingDisplay';
import styles from './AdminBookings.module.css';

interface Props {
    events: BookingTimelineEvent[];
}

const TIMELINE_LABELS: Record<string, string> = {
    'Booking created': 'Đã tạo lịch đặt',
    'Deposit paid': 'Đã thanh toán tiền cọc',
    'Full payment received': 'Đã thanh toán toàn bộ',
    'Booking cancelled': 'Đã hủy lịch đặt',
};

/**
 * Vertical timeline cho booking events.
 * Dot — line — content layout. Sort theo `occurredAt` ASC (cũ → mới).
 */
export default function BookingTimelineCard({ events }: Props) {
    if (!events.length) {
        return (
            <section className={`${styles.card} ${styles.cardFull}`}>
                <h2 className={styles.cardTitle}>Lịch sử trạng thái</h2>
                <div className={styles.emptyMini}>Chưa có sự kiện nào.</div>
            </section>
        );
    }

    const sorted = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );

    return (
        <section className={`${styles.card} ${styles.cardFull}`}>
            <h2 className={styles.cardTitle}>Lịch sử trạng thái</h2>
            <ol className={styles.timeline}>
                {sorted.map((event, idx) => {
                    const statusDisplay = event.status ? getBookingStatusDisplay(event.status) : null;
                    const isLast = idx === sorted.length - 1;
                    return (
                        <li key={`${event.occurredAt}-${idx}`} className={styles.timelineItem}>
                            <div className={styles.timelineDotWrap}>
                                <span
                                    className={`${styles.timelineDot} ${
                                        isLast ? styles.timelineDotActive : ''
                                    }`}
                                />
                                {idx < sorted.length - 1 && <span className={styles.timelineLine} />}
                            </div>
                            <div className={styles.timelineContent}>
                                <div className={styles.timelineHeader}>
                                    <span className={styles.timelineLabel}>
                                        {TIMELINE_LABELS[event.label] ?? event.label}
                                    </span>
                                    {statusDisplay && (
                                        <StatusBadge variant={statusDisplay.variant} shape="tag">
                                            {statusDisplay.label}
                                        </StatusBadge>
                                    )}
                                </div>
                                <div className={styles.timelineTime}>
                                    {formatDateTime(event.occurredAt)}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
