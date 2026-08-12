import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { StatusBadge } from '../../components/shared';
import { getAdminBookingDetail } from '../../services/adminBooking.service';
import type { AdminBookingDetailResponse } from '../../types/adminBooking.types';
import { formatDateTime } from '../../utils/formatters';
import {
    getBookingStatusDisplay,
    getTeachingModeLabel,
} from './bookingDisplay';
import BookingTimelineCard from './BookingTimelineCard';
import LessonsListCard from './LessonsListCard';
import PaymentBreakdownCard from './PaymentBreakdownCard';
import styles from './AdminBookings.module.css';

/**
 * Admin Booking detail page — gọi GET /api/admin/bookings/:id.
 *
 * BE response (`AdminBookingDetailResponse`) hiện trả:
 *  - Booking core (id, status, teachingMode, location, paymentCode)
 *  - Tutor, Parent, Student, Subject
 *  - Financials (price, discount, final, paymentStatus)
 *  - Progress (totalSessions, completedSessions, startDate)
 *  - Cancellation (isCancelled, reason, cancelledAt)
 *  - createdAt, updatedAt
 *
 * Tester yêu cầu thêm: status timeline, lessons list, payment breakdown
 * (deposit/remaining). Hiện CHƯA có trong BE response → có banner báo gap.
 */
export default function AdminBookingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const bookingId = id ? parseInt(id, 10) : NaN;

    const [data, setData] = useState<AdminBookingDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (Number.isNaN(bookingId)) {
            setErrorMsg('Mã đặt lịch không hợp lệ.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            setErrorMsg(null);
            try {
                const res = await getAdminBookingDetail(bookingId);
                if (cancelled) return;
                setData(res.content);
            } catch (err: unknown) {
                if (cancelled) return;
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 404) {
                    setErrorMsg('Không tìm thấy lịch đặt này.');
                } else {
                    setErrorMsg('Không thể tải chi tiết đặt lịch. Vui lòng thử lại.');
                    toast.error('Không thể tải chi tiết đặt lịch.', {
                        toastId: 'admin-booking-detail-error',
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    // Loading state
    if (loading) {
        return (
            <div className={styles.detailPage}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    ← Quay lại danh sách
                </button>
                <div className={styles.loadingWrap}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    // Error state
    if (errorMsg || !data) {
        return (
            <div className={styles.detailPage}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    ← Quay lại danh sách
                </button>
                <div className={styles.errorWrap}>
                    <div>
                        <div style={{ marginBottom: 8, color: '#dc2626', fontWeight: 600 }}>
                            {errorMsg ?? 'Không có dữ liệu'}
                        </div>
                        <div className={styles.errorActions}>
                            <button
                                className={styles.viewBtn}
                                onClick={() => navigate(-1)}
                            >
                                Về danh sách
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const statusDisplay = getBookingStatusDisplay(data.status);

    return (
        <div className={styles.detailPage}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
                ← Quay lại danh sách
            </button>

            {/* ─── Header ─── */}
            <section className={styles.detailHeader}>
                <div>
                    <h1 className={styles.detailHeaderTitle}>
                        Đặt lịch #{data.bookingId}
                        {data.paymentCode && (
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#6b7280',
                                    marginLeft: 10,
                                }}
                            >
                                ({data.paymentCode})
                            </span>
                        )}
                    </h1>
                    <div className={styles.detailHeaderMeta}>
                        {data.createdAt && <span>Tạo lúc: {formatDateTime(data.createdAt)}</span>}
                        {data.updatedAt && <span>Cập nhật lúc: {formatDateTime(data.updatedAt)}</span>}
                    </div>
                </div>
                <div className={styles.detailHeaderRight}>
                    <StatusBadge variant={statusDisplay.variant}>{statusDisplay.label}</StatusBadge>
                </div>
            </section>

            {/* ─── Body grid ─── */}
            <div className={styles.cardGrid}>
                {/* Parties */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Các bên liên quan</h2>

                    {data.tutor && (
                        <div className={styles.partyRow}>
                            {data.tutor.avatarUrl ? (
                                <img
                                    src={data.tutor.avatarUrl}
                                    alt={data.tutor.name ?? 'Tutor'}
                                    className={styles.partyAvatar}
                                />
                            ) : (
                                <div
                                    className={`${styles.partyAvatar} ${styles.partyAvatarPlaceholder}`}
                                >
                                    {data.tutor.name?.charAt(0).toUpperCase() ?? 'T'}
                                </div>
                            )}
                            <div className={styles.partyInfo}>
                                <span className={styles.partyRole}>Gia sư</span>
                                <span className={styles.partyName}>{data.tutor.name ?? '—'}</span>
                                {data.tutor.email && (
                                    <span className={styles.partyMeta}>{data.tutor.email}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {data.parent && (
                        <div className={styles.partyRow}>
                            {data.parent.avatarUrl ? (
                                <img
                                    src={data.parent.avatarUrl}
                                    alt={data.parent.name ?? 'Parent'}
                                    className={styles.partyAvatar}
                                />
                            ) : (
                                <div
                                    className={`${styles.partyAvatar} ${styles.partyAvatarPlaceholder}`}
                                >
                                    {data.parent.name?.charAt(0).toUpperCase() ?? 'P'}
                                </div>
                            )}
                            <div className={styles.partyInfo}>
                                <span className={styles.partyRole}>Phụ huynh</span>
                                <span className={styles.partyName}>{data.parent.name ?? '—'}</span>
                                {data.parent.email && (
                                    <span className={styles.partyMeta}>{data.parent.email}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {data.student && (
                        <div className={styles.partyRow}>
                            {data.student.avatarUrl ? (
                                <img
                                    src={data.student.avatarUrl}
                                    alt={data.student.name ?? 'Student'}
                                    className={styles.partyAvatar}
                                />
                            ) : (
                                <div
                                    className={`${styles.partyAvatar} ${styles.partyAvatarPlaceholder}`}
                                >
                                    {data.student.name?.charAt(0).toUpperCase() ?? 'S'}
                                </div>
                            )}
                            <div className={styles.partyInfo}>
                                <span className={styles.partyRole}>Học sinh</span>
                                <span className={styles.partyName}>{data.student.name ?? '—'}</span>
                                {data.student.gradeLevel && (
                                    <span className={styles.partyMeta}>{data.student.gradeLevel}</span>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Schedule / Lesson info */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Lịch học</h2>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Môn học</span>
                        <span className={styles.rowValue}>{data.subject?.name ?? '—'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Hình thức</span>
                        <span className={styles.rowValue}>
                            {getTeachingModeLabel(data.teachingMode)}
                        </span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Địa điểm</span>
                        <span className={styles.rowValue}>
                            {data.teachingMode?.toLowerCase() === 'online'
                                ? 'Trực tuyến'
                                : data.location ?? '—'}
                        </span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Bắt đầu</span>
                        <span className={styles.rowValue}>
                            {data.progress?.startDate
                                ? formatDateTime(data.progress.startDate)
                                : '—'}
                        </span>
                    </div>
                </section>

                {/* Progress — full row vì PaymentBreakdownCard kế tiếp đã full width */}
                <section className={`${styles.card} ${styles.cardFull}`}>
                    <h2 className={styles.cardTitle}>Tiến độ</h2>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Tổng số buổi</span>
                        <span className={styles.rowValue}>{data.progress?.totalSessions ?? '—'}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Đã hoàn thành</span>
                        <span className={styles.rowValue}>
                            <span className={styles.rowValueStrong}>
                                {data.progress?.completedSessions ?? 0}
                            </span>
                            {data.progress?.totalSessions != null && (
                                <span style={{ color: '#6b7280', marginLeft: 6 }}>
                                    / {data.progress.totalSessions}
                                </span>
                            )}
                        </span>
                    </div>
                    {data.progress?.totalSessions ? (
                        <div style={{ marginTop: 12 }}>
                            <div
                                style={{
                                    height: 8,
                                    background: '#e5e7eb',
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${Math.min(
                                            100,
                                            ((data.progress.completedSessions ?? 0) /
                                                data.progress.totalSessions) *
                                                100,
                                        )}%`,
                                        background: '#1a2238',
                                        transition: 'width 0.3s ease',
                                    }}
                                />
                            </div>
                        </div>
                    ) : null}
                </section>

                {/* Payment breakdown — full row, thay thế Financials card cũ */}
                <PaymentBreakdownCard payment={data.paymentBreakdown} />

                {/* Timeline trạng thái booking — full row */}
                <BookingTimelineCard events={data.timeline} />

                {/* Danh sách buổi học — full row */}
                <LessonsListCard lessons={data.classSessions} />

                {/* Cancellation — chỉ hiện khi booking đã hủy */}
                {data.cancellation?.isCancelled && (
                    <section className={`${styles.card} ${styles.cancelCard} ${styles.cardFull}`}>
                        <h2 className={styles.cardTitle}>Thông tin hủy</h2>
                        <div className={styles.row}>
                            <span className={styles.rowLabel}>Thời điểm hủy</span>
                            <span className={styles.rowValue}>
                                {data.cancellation.cancelledAt
                                    ? formatDateTime(data.cancellation.cancelledAt)
                                    : '—'}
                            </span>
                        </div>
                        {data.cancellation.reason && (
                            <div className={styles.row}>
                                <span className={styles.rowLabel}>Lý do</span>
                                <span className={styles.rowValue}>{data.cancellation.reason}</span>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
