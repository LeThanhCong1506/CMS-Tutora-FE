import type { AdminBookingPaymentBreakdown } from '../../types/adminBooking.types';
import { StatusBadge } from '../../components/shared';
import { formatDateTime } from '../../utils/formatters';
import {
    formatVND,
    getPaymentStatusDisplay,
    getEscrowStatusDisplay,
    getRefundStatusDisplay,
} from './bookingDisplay';
import styles from './AdminBookings.module.css';

interface Props {
    payment: AdminBookingPaymentBreakdown;
}

/**
 * Payment breakdown đầy đủ cho admin: deposit/remaining + fee split + escrow + refund.
 *
 * Thay thế card "Thanh toán" cũ (chỉ có Price/Discount/Final/Status) — vì
 * `PaymentBreakdown` đã chứa toàn bộ thông tin đó cộng thêm chi tiết phí và escrow.
 *
 * BE chưa trả `Transactions[]` (lịch sử giao dịch) — nếu cần track payment method,
 * yêu cầu Công bổ sung sau.
 */
export default function PaymentBreakdownCard({ payment }: Props) {
    const paymentStatusDisplay = getPaymentStatusDisplay(payment.paymentStatus);
    const escrowDisplay = getEscrowStatusDisplay(payment.escrowStatus);
    const refundDisplay = payment.refundStatus
        ? getRefundStatusDisplay(payment.refundStatus)
        : null;
    const hasDiscount = (payment.discountApplied ?? 0) > 0;
    const hasRefund = (payment.refundAmount ?? 0) > 0 || refundDisplay !== null;

    // Phí sàn cắt từ gia sư KHÔNG được BE lưu thành cột riêng: cột `Tutorfee` thực chất là
    // TutorReceivable (số tiền gia sư NHẬN), không phải khoản phí. Suy ra từ 2 số đã có, đúng
    // cách BookingService đang tính (tutorFeeCut = platformFee − parentFee) — chuẩn xác về lịch
    // sử vì cả 2 đều được chốt lúc tạo booking, không đổi khi admin chỉnh % hoa hồng sau này.
    const tutorCommission =
        payment.platformFee != null && payment.parentFee != null
            ? Math.max(payment.platformFee - payment.parentFee, 0)
            : undefined;

    return (
        <section className={`${styles.card} ${styles.cardFull}`}>
            <h2 className={styles.cardTitle}>Thanh toán</h2>

            <div className={styles.paymentGrid}>
                {/* ─── Cột 1: Tổng tiền + Deposit/Remaining ─── */}
                <div className={styles.paymentCol}>
                    <h3 className={styles.subSection}>Tổng quan</h3>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Giá gốc</span>
                        <span className={styles.rowValue}>{formatVND(payment.originalPrice)}</span>
                    </div>
                    {hasDiscount && (
                        <div className={styles.row}>
                            <span className={styles.rowLabel}>Giảm giá</span>
                            <span className={styles.rowValue} style={{ color: '#15803d' }}>
                                − {formatVND(payment.discountApplied)}
                            </span>
                        </div>
                    )}
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Tổng tiền</span>
                        <span className={`${styles.rowValue} ${styles.rowValueStrong}`}>
                            {formatVND(payment.finalPrice)}
                        </span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Trạng thái</span>
                        <span className={styles.rowValue}>
                            <StatusBadge variant={paymentStatusDisplay.variant} shape="tag">
                                {paymentStatusDisplay.label}
                            </StatusBadge>
                        </span>
                    </div>
                    {payment.paymentDueAt && (
                        <div className={styles.row}>
                            <span className={styles.rowLabel}>Hạn thanh toán</span>
                            <span className={styles.rowValue}>{formatDateTime(payment.paymentDueAt)}</span>
                        </div>
                    )}

                    <h3 className={styles.subSection} style={{ marginTop: 18 }}>
                        Hai pha thanh toán
                    </h3>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>
                            Đặt cọc
                            {payment.depositPaidAt ? (
                                <StatusBadge variant="success" shape="tag" className={styles.inlineBadge}>
                                    Đã trả
                                </StatusBadge>
                            ) : (
                                <StatusBadge variant="warning" shape="tag" className={styles.inlineBadge}>
                                    Chưa trả
                                </StatusBadge>
                            )}
                        </span>
                        <span className={styles.rowValue}>
                            <div className={styles.cellStack}>
                                <span>{formatVND(payment.depositAmount)}</span>
                                {payment.depositPaidAt && (
                                    <span className={styles.cellSecondary}>
                                        {formatDateTime(payment.depositPaidAt)}
                                    </span>
                                )}
                            </div>
                        </span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>
                            Còn lại
                            {payment.remainingPaidAt ? (
                                <StatusBadge variant="success" shape="tag" className={styles.inlineBadge}>
                                    Đã trả
                                </StatusBadge>
                            ) : (
                                <StatusBadge variant="warning" shape="tag" className={styles.inlineBadge}>
                                    Chưa trả
                                </StatusBadge>
                            )}
                        </span>
                        <span className={styles.rowValue}>
                            <div className={styles.cellStack}>
                                <span>{formatVND(payment.remainingAmount)}</span>
                                {payment.remainingPaidAt && (
                                    <span className={styles.cellSecondary}>
                                        {formatDateTime(payment.remainingPaidAt)}
                                    </span>
                                )}
                            </div>
                        </span>
                    </div>
                </div>

                {/* ─── Cột 2: Fee split + Escrow + Refund ─── */}
                <div className={styles.paymentCol}>
                    <h3 className={styles.subSection}>Phân chia phí</h3>
                    {/* Doanh thu nền tảng = phí thu phụ huynh + phí sàn cắt gia sư. Hiện tổng
                        trước rồi thụt 2 dòng cấu thành vào trong, để admin thấy ngay nguồn nào
                        đóng góp bao nhiêu thay vì phải tự trừ nhẩm. */}
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Phí nền tảng (tổng)</span>
                        <span className={`${styles.rowValue} ${styles.rowValueStrong}`}>
                            {formatVND(payment.platformFee)}
                        </span>
                    </div>
                    <div className={`${styles.row} ${styles.rowSub}`}>
                        <span className={styles.rowLabel}>↳ Phí phụ huynh trả</span>
                        <span className={styles.rowValue}>{formatVND(payment.parentFee)}</span>
                    </div>
                    <div className={`${styles.row} ${styles.rowSub}`}>
                        <span className={styles.rowLabel}>↳ Phí sàn gia sư</span>
                        <span className={styles.rowValue}>{formatVND(tutorCommission)}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Phí gia sư nhận</span>
                        <span className={styles.rowValue}>{formatVND(payment.tutorFee)}</span>
                    </div>

                    <h3 className={styles.subSection} style={{ marginTop: 18 }}>
                        Escrow
                    </h3>
                    <div className={styles.row}>
                        <span className={styles.rowLabel}>Trạng thái escrow</span>
                        <span className={styles.rowValue}>
                            <StatusBadge variant={escrowDisplay.variant} shape="tag">
                                {escrowDisplay.label}
                            </StatusBadge>
                        </span>
                    </div>

                    {hasRefund && (
                        <>
                            <h3 className={styles.subSection} style={{ marginTop: 18 }}>
                                Hoàn tiền
                            </h3>
                            <div className={styles.row}>
                                <span className={styles.rowLabel}>Số tiền hoàn</span>
                                <span className={styles.rowValue}>
                                    {formatVND(payment.refundAmount)}
                                </span>
                            </div>
                            {refundDisplay && (
                                <div className={styles.row}>
                                    <span className={styles.rowLabel}>Trạng thái</span>
                                    <span className={styles.rowValue}>
                                        <StatusBadge variant={refundDisplay.variant} shape="tag">
                                            {refundDisplay.label}
                                        </StatusBadge>
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
